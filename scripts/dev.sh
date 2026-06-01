#!/usr/bin/env bash
#
# Запуск фронта (budget-web) и бэка (budget-api) одной командой.
# Только для локальной разработки.
#
# Использование:
#   ./scripts/dev.sh
#
# Ctrl+C останавливает оба процесса сразу.

set -euo pipefail

# Корень фронта = на уровень выше папки scripts, бэк лежит рядом.
WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$(cd "$WEB_DIR/.." && pwd)/budget-api"

if [ ! -d "$API_DIR" ]; then
  echo "Не нашёл бэк в $API_DIR — лежит ли budget-api рядом с budget-web?" >&2
  exit 1
fi

# Цветные префиксы, чтобы различать логи двух процессов в общем выводе.
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RESET='\033[0m'

pids=()

# По выходу (в т.ч. по Ctrl+C) гасим всю группу дочерних процессов.
cleanup() {
  echo ""
  echo "Останавливаю фронт и бэк..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Запускаю бэк:  $API_DIR (npm run start:dev)"
echo "Запускаю фронт: $WEB_DIR (npm run dev)"
echo ""

# Каждый процесс пишет в общий stdout со своим префиксом.
( cd "$API_DIR" && npm run start:dev ) 2>&1 | sed "s/^/$(printf "%b" "$BLUE")[api]$(printf "%b" "$RESET") /" &
pids+=($!)

( cd "$WEB_DIR" && npm run dev ) 2>&1 | sed "s/^/$(printf "%b" "$GREEN")[web]$(printf "%b" "$RESET") /" &
pids+=($!)

# Ждём оба; если один упал — cleanup погасит второй.
wait
