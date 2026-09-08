#!/bin/sh
# Разовый выпуск TLS-сертификата Let's Encrypt для стенда.
#
# Запускать ОДИН раз при первом деплое, из каталога tracker-deploy:
#   ./scripts/init-letsencrypt.sh
#
# Зачем нужен трюк с временным сертификатом:
# nginx не стартует с блоком `listen 443 ssl`, если файла сертификата ещё нет.
# Но и certbot не выпустит настоящий сертификат, пока nginx не отвечает на
# ACME-челлендж по HTTP. Замкнутый круг разрываем так:
#   1) кладём самоподписанный заглушечный сертификат → nginx стартует;
#   2) nginx начинает отвечать на /.well-known/acme-challenge/;
#   3) удаляем заглушку и просим у Let's Encrypt настоящий сертификат;
#   4) перезагружаем nginx уже с валидным сертификатом.
# Дальше продление автоматическое — этим занимается сервис certbot в compose.
set -e

COMPOSE="docker compose --env-file .env.prod -f docker-compose.prod.yml"

# Подтягиваем DUCKDNS_DOMAIN и CERTBOT_EMAIL из .env.prod.
if [ ! -f .env.prod ]; then
  echo "Нет файла .env.prod — скопируй .env.prod.example и заполни." >&2
  exit 1
fi
# shellcheck disable=SC1091
. ./.env.prod

if [ -z "$DUCKDNS_DOMAIN" ] || [ -z "$CERTBOT_EMAIL" ]; then
  echo "В .env.prod должны быть заданы DUCKDNS_DOMAIN и CERTBOT_EMAIL." >&2
  exit 1
fi

CERT_DIR="./certbot/conf/live/$DUCKDNS_DOMAIN"

echo "==> 1/4 Кладу временный самоподписанный сертификат для $DUCKDNS_DOMAIN"
mkdir -p "$CERT_DIR" ./certbot/www
# У образа certbot/certbot ENTRYPOINT = сама программа certbot, поэтому здесь
# переопределяем его на sh (--entrypoint sh), иначе openssl-команда уйдёт
# как аргумент в certbot и он упадёт с "Unable to open config file".
docker run --rm -v "$(pwd)/certbot/conf:/etc/letsencrypt" --entrypoint sh certbot/certbot \
  -c "openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/$DUCKDNS_DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DUCKDNS_DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'"

echo "==> 2/4 Поднимаю nginx с временным сертификатом"
$COMPOSE up -d proxy

echo "==> 3/4 Удаляю заглушку и запрашиваю настоящий сертификат у Let's Encrypt"
rm -rf "$CERT_DIR"
# В compose сервису certbot задан свой entrypoint (цикл renew), поэтому для
# разового выпуска переопределяем entrypoint на бинарь certbot, а сабкоманду и
# флаги передаём как аргументы (в compose v2 строка с пробелами в --entrypoint
# не разбивается на слова, поэтому нельзя всё писать одной строкой).
$COMPOSE run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
    --email $CERTBOT_EMAIL \
    -d $DUCKDNS_DOMAIN \
    --agree-tos --no-eff-email --force-renewal

echo "==> 4/4 Перезагружаю nginx с боевым сертификатом"
$COMPOSE exec proxy nginx -s reload

echo "Готово. Сертификат для $DUCKDNS_DOMAIN выпущен."
echo "Теперь можно поднять весь стек: $COMPOSE up -d --build"
