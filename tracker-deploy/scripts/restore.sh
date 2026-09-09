#!/usr/bin/env bash
#
# Восстановление прод-базы Tracker из копии, снятой backup.sh.
# Умеет брать и локальный файл из /var/backups/tracker, и объект из Timeweb S3
# (зашифрованный .gpg расшифровывается сам).
#
# Скрипт ПЕРЕЗАПИСЫВАЕТ боевую базу, поэтому:
#   - спрашивает подтверждение и не запускается из cron;
#   - перед перезаписью снимает страховочный дамп текущего состояния —
#     если восстановились «не туда», откатиться будет чем.
#
# Показать доступные копии:  ./restore.sh
# Восстановить:              ./restore.sh tracker-db-2026-09-09_033001.dump.gpg
#                            ./restore.sh /var/backups/tracker/tracker-db-....dump

set -euo pipefail

# --- Пути (та же схема, что в backup.sh: считаем от места самого скрипта) ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

BACKUP_DIR="/var/backups/tracker"
LOG_FILE="/var/log/tracker-restore.log"

S3_REMOTE="timeweb:tracker-backups-f"
PASSPHRASE_FILE="/root/.config/tracker-backup.passphrase"
export RCLONE_CONFIG="/root/.config/rclone/rclone.conf"

COMPOSE=(docker compose
  --env-file "$DEPLOY_DIR/.env.prod"
  -f "$DEPLOY_DIR/docker-compose.prod.yml")

mkdir -p "$BACKUP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1
log() { echo "[$(date '+%F %T')] $*"; }

# Расшифрованный дамп — это персональные данные в открытом виде. Держим его во
# временном каталоге и сносим на любом выходе, включая ошибку и Ctrl+C.
TMP_DIR="$(mktemp -d)"
DUMP_IN_CONTAINER=0   # успели ли скопировать дамп внутрь контейнера db
cleanup() {
  rm -rf "$TMP_DIR"
  # Если вышли на полпути (отмена, ошибка) — не оставляем открытый дамп в контейнере.
  if [ "$DUMP_IN_CONTAINER" = "1" ]; then
    "${COMPOSE[@]}" exec -T db rm -f /tmp/restore.dump >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# --- Без аргументов: показать, из чего вообще можно восстанавливаться --------
if [ $# -eq 0 ]; then
  echo "Локальные копии в $BACKUP_DIR:"
  ls -lh "$BACKUP_DIR" 2>/dev/null | grep -E 'tracker-' || echo "  (нет)"
  echo
  echo "Копии в бакете $S3_REMOTE/db/:"
  rclone lsl "$S3_REMOTE/db/" || echo "  (не удалось получить список)"
  echo
  echo "Запуск: $0 <имя файла или полный путь>"
  exit 0
fi

SRC="$1"

# --- Достаём файл: локальный путь, имя в /var/backups или объект в бакете ----
if [ -f "$SRC" ]; then
  WORK_FILE="$SRC"
  log "Беру локальный файл: $WORK_FILE"
elif [ -f "$BACKUP_DIR/$SRC" ]; then
  WORK_FILE="$BACKUP_DIR/$SRC"
  log "Беру локальный файл: $WORK_FILE"
else
  log "Локально не нашёл, качаю из $S3_REMOTE/db/$SRC"
  rclone copy "$S3_REMOTE/db/$SRC" "$TMP_DIR/"
  WORK_FILE="$TMP_DIR/$(basename "$SRC")"
  [ -f "$WORK_FILE" ] || { log "ОШИБКА: копия '$SRC' не найдена ни локально, ни в бакете"; exit 1; }
fi

# --- Расшифровка ------------------------------------------------------------
# Из бакета копии приезжают зашифрованными. Пароль берём из файла на сервере;
# если файла нет (например, восстанавливаемся на чистой машине) — gpg спросит
# его интерактивно, и тогда нужен пароль из менеджера паролей.
case "$WORK_FILE" in
  *.gpg)
    DECRYPTED="$TMP_DIR/$(basename "${WORK_FILE%.gpg}")"
    log "Расшифровываю в $DECRYPTED"
    if [ -f "$PASSPHRASE_FILE" ]; then
      gpg --batch --yes --decrypt --passphrase-file "$PASSPHRASE_FILE" \
        --output "$DECRYPTED" "$WORK_FILE"
    else
      log "Файла с паролем нет — gpg спросит пароль (ищи 'tracker-backup-gpg' в менеджере паролей)"
      gpg --yes --decrypt --output "$DECRYPTED" "$WORK_FILE"
    fi
    WORK_FILE="$DECRYPTED"
    ;;
esac

# --- Проверки перед тем, как трогать боевую базу ----------------------------
if ! "${COMPOSE[@]}" ps --status running --services | grep -qx db; then
  log "ОШИБКА: контейнер db не запущен — восстанавливать некуда"
  exit 1
fi

# Кладём дамп внутрь контейнера: pg_restore с custom-архивом хочет обычный файл,
# а не поток на stdin. Хостового pg_restore на сервере нет — postgres живёт
# только в контейнере, поэтому и проверяем файл его же средствами.
log "Копирую дамп в контейнер db"
"${COMPOSE[@]}" cp "$WORK_FILE" db:/tmp/restore.dump
DUMP_IN_CONTAINER=1

# Дешёвая проверка, что это вообще pg_dump custom-формата, а не обрезанный файл:
# pg_restore -l читает оглавление архива, ничего не меняя в базе.
if ! "${COMPOSE[@]}" exec -T db pg_restore -l /tmp/restore.dump >/dev/null 2>&1; then
  log "ОШИБКА: файл не похож на дамп pg_dump -Fc"
  exit 1
fi

echo
echo "  Восстановление БОЕВОЙ базы из: $WORK_FILE"
echo "  Все текущие данные будут заменены содержимым этой копии."
echo
# Читаем ответ прямо с терминала: stdout выше перенаправлен в tee, а из cron
# терминала нет — так скрипт физически не сможет отработать «сам по себе».
if [ ! -e /dev/tty ]; then
  log "ОШИБКА: нет терминала, восстановление в неинтерактивном режиме запрещено"
  exit 1
fi
read -r -p "Введите слово restore, чтобы продолжить: " ANSWER < /dev/tty
if [ "$ANSWER" != "restore" ]; then
  log "Отменено пользователем"
  exit 1
fi

# --- Страховочный дамп текущего состояния -----------------------------------
# Снимается ДО остановки api: база консистентна и так, а лишняя минута простоя
# ни к чему. Если окажется, что восстановили не ту копию — откат отсюда.
SAFETY_FILE="$BACKUP_DIR/tracker-db-prerestore-$(date +%F_%H%M%S).dump"
log "Страховочный дамп текущей базы: $SAFETY_FILE"
"${COMPOSE[@]}" exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$SAFETY_FILE"
chmod 600 "$SAFETY_FILE"

# --- Останавливаем api ------------------------------------------------------
# Пока идёт restore, объекты в базе дропаются и создаются заново. Живой api в
# это время получал бы ошибки и мог записать что-нибудь в полупустую базу.
log "Останавливаю api"
"${COMPOSE[@]}" stop api

# --- Собственно восстановление ----------------------------------------------
# --clean --if-exists — сначала снести существующие объекты, не ругаясь на те,
#     которых нет (иначе restore упадёт на первой же занятой таблице);
# --no-owner          — не выставлять владельца из дампа: роли это объекты
#     кластера, в дампе одной базы их нет (грабли, всплывшие на тесте
#     восстановления). Объекты достанутся пользователю, которым подключились;
# --single-transaction — всё или ничего: при ошибке база останется как была,
#     а не в полуразобранном состоянии.
log "Запускаю pg_restore"
set +e   # временно, чтобы поднять api даже если restore ругнулся
"${COMPOSE[@]}" exec -T db sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
     --clean --if-exists --no-owner --single-transaction /tmp/restore.dump'
RESTORE_RC=$?
set -e

"${COMPOSE[@]}" exec -T db rm -f /tmp/restore.dump
DUMP_IN_CONTAINER=0

# --- Поднимаем api ----------------------------------------------------------
# На старте контейнер прогоняет prisma migrate deploy. Это безопасно: таблица
# _prisma_migrations лежит в том же дампе, уже применённые миграции повторно
# не накатываются.
log "Поднимаю api"
"${COMPOSE[@]}" start api

if [ "$RESTORE_RC" -ne 0 ]; then
  log "ВНИМАНИЕ: pg_restore завершился с кодом $RESTORE_RC — проверь лог выше."
  log "Откат к состоянию до восстановления: $0 $SAFETY_FILE"
  exit "$RESTORE_RC"
fi

log "=== Восстановление завершено. Страховочная копия: $SAFETY_FILE ==="
