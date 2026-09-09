# tracker-deploy

Инфраструктура для деплоя **Tracker: AI Budget App** на свой VPS. Поднимает за
одним доменом фронт (`budget-web`), бэк (`budget-api`) и Postgres, с HTTPS от
Let's Encrypt.

```
Интернет (https) → proxy (nginx) ┬→ /     → web (статика фронта)
                                 └→ /api/ → api (NestJS) → db (postgres)
```

Всё лежит в одном монорепозитории — `docker-compose.prod.yml` собирает образы из
соседних каталогов:

```
tracker/
├── budget-web/
├── budget-api/
└── tracker-deploy/   ← ты здесь
```

---

## Состояние стенда (8 сентября 2026)

Стенд **развёрнут и работает**: https://trackerbyfialkovskiy.duckdns.org —
проверено с компьютера и с телефона, включая голосовой ввод.

- **Хостер:** FirstVDS, тариф VDS-KVM-NVMe-Разгон-10 (2 ядра / 4 ГБ / 60 ГБ
  NVMe), Ubuntu 24.04, дата-центр Амстердам (EU). IP доступен из РФ напрямую (IP
  — в панели FirstVDS).
- **Домен:** trackerbyfialkovskiy.duckdns.org (DuckDNS).
- **Сертификат:** Let's Encrypt, действует до 07.12.2026, продление — сервисом
  `certbot` в compose.
- **Доступ:** SSH по ключу под root (`ssh root@<IP>`).
- **Секреты:** в `.env.prod` на сервере (в git не попадает).

Инструкция ниже написана хостеро-нейтрально — шаги от провайдера не зависят.

---

## Этап 1. Поднять стенд руками

### 1. Сервер

> Стенд поднят на **FirstVDS** (Амстердам). Шаги хостеро-нейтральны — у любого
> провайдера то же самое. Timeweb отпал по оплате, OVH — по KYC; берём
> провайдера с не-РФ локацией и удобной оплатой.

1. Зарегистрируйся у выбранного провайдера.
2. **Создай сервер**:
   - ОС: **Ubuntu 24.04**;
   - Локация: **не РФ** (использован Амстердам) — важно, чтобы голосовой ввод
     ходил на OpenRouter без геоблока;
   - Тариф: **2 vCPU / 4 ГБ RAM / NVMe** (не минималку — на 1 ГБ сборка образов
     на сервере падает с OOM);
   - Виртуализация **KVM** — чтобы Docker завёлся.
3. Добавь свой SSH-ключ (`cat ~/.ssh/id_ed25519.pub`; если ключа нет —
   `ssh-keygen -t ed25519`).
4. Создай сервер, запомни его публичный IPv4.
5. Открой порты **22** (SSH), **80** (HTTP), **443** (HTTPS): в панели
   провайдера (раздел файрвола) либо через `ufw` на самом сервере. 80/443
   обязательны для выпуска сертификата Let's Encrypt.

### 2. Домен (DuckDNS)

1. Зайди на https://www.duckdns.org через GitHub/Google.
2. Придумай поддомен, напр. `budget-tracker` → получишь
   `budget-tracker.duckdns.org`.
3. В поле **current ip** впиши IP сервера, нажми **update**.
4. Проверь: `ping budget-tracker.duckdns.org` должен резолвиться в твой IP.

### 3. Подготовка сервера

Зайди на сервер: `ssh root@<IP>`. Установи Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

Склонируй монорепозиторий (репозиторий публичный — проще по HTTPS, ключ на
сервере не нужен):

```bash
git clone https://github.com/Ko1iya/tracker.git ~/tracker
cd ~/tracker/tracker-deploy
```

### 4. Секреты

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Заполни:

- `DUCKDNS_DOMAIN` — твой поддомен;
- `CERTBOT_EMAIL` — почта (Let's Encrypt шлёт туда уведомления об истечении);
- `POSTGRES_PASSWORD` — надёжный пароль, и тот же пароль в `DATABASE_URL`;
- `JWT_SECRET` — сгенерируй новый: `openssl rand -hex 64`;
- `NEXARA_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` — перенеси из
  локального `budget-api/.env`.

### 5. Выпуск сертификата и запуск

```bash
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh                       # разовый выпуск TLS-сертификата
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Открой `https://<твой-домен>.duckdns.org` — с компьютера и с телефона. Проверь
логин, создание категории/транзакции и голосовой ввод (он требует именно
валидный HTTPS, который мы только что и настроили).

### Полезные команды

```bash
# статус и логи
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api

# релиз правок (пока вручную — на Этапе 2 заменим на git push)
cd ~/tracker && git pull
cd ~/tracker/tracker-deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Миграции Prisma накатываются автоматически при старте контейнера `api` (см.
`budget-api/docker-entrypoint.sh`).

### ⚠️ TODO: починить `scripts/init-letsencrypt.sh`

Скрипт **сейчас нерабочий** — при первом реальном прогоне (8 сентября 2026)
выпуск сертификата пришлось доделывать руками. Две проблемы:

1. **Entrypoint образа certbot** (частично исправлено, commit d1b3420): у образа
   `certbot/certbot` свой `ENTRYPOINT=certbot`, поэтому нельзя писать
   `docker run certbot/certbot sh -c "..."` — команда уйдёт аргументом в
   certbot. Нужно `--entrypoint sh` (для openssl-заглушки) и
   `--entrypoint certbot` (для `certonly`). В compose v2 строка с пробелами в
   `--entrypoint` не разбивается — сабкоманду и флаги передавать отдельными
   аргументами после имени сервиса.

2. **Замкнутый круг заглушки** (главное, ещё не исправлено): nginx-конфиг
   монолитный — блок `listen 443 ssl` роняет весь nginx (включая порт 80 для
   ACME-challenge), если файла сертификата нет. А заглушку надо удалить перед
   выпуском (certbot не пишет в непустую `live/<домен>/`). С `restart: always`
   контейнер `proxy` в окне без сертификата уходит в crash-loop → порт 80
   умирает → challenge проваливается. Именно на этом скрипт и падает.

---

## Этап 2. Кнопка релиза (CI/CD)

Цель: `git push` в `main` → GitHub сам собирает образ, заливает на сервер и
перезапускает. Подключаем, когда Этап 1 уже работает.

### 2.1. Сервер тянет образы из GitHub Container Registry

Замени в `docker-compose.prod.yml` у сервисов `web` и `api` блок `build:` на
`image:` (подставь свой GitHub-логин):

```yaml
api:
  image: ghcr.io/<user>/budget-api:latest
  # build: убрать
web:
  image: ghcr.io/<user>/budget-web:latest
  # build: убрать
```

### 2.2. Один workflow на монорепо

Проект живёт в одном репозитории, поэтому workflow тоже один —
`.github/workflows/deploy.yml` в корне. Ключевая деталь: **path-фильтры**, чтобы
правка фронта не пересобирала бэк и наоборот. `dorny/paths-filter` смотрит, что
именно изменилось в пуше, и джобы сборки запускаются условно.

```yaml
name: deploy
on:
  push:
    branches: [main]

jobs:
  # что изменилось в этом пуше
  changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'budget-api/**'
            web:
              - 'budget-web/**'

  build-api:
    needs: changes
    if: needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./budget-api # ← контекст сборки, не корень репо
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/budget-api:latest

  build-web:
    needs: changes
    if: needs.changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./budget-web
          build-args: VITE_API_URL=/api
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/budget-web:latest

  # передеплой на сервере — после всех сборок, которые реально запускались
  deploy:
    needs: [build-api, build-web]
    if: always() && !failure() && !cancelled()
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd ~/tracker && git pull
            cd tracker-deploy
            docker compose --env-file .env.prod -f docker-compose.prod.yml pull
            docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Про `if: always() && !failure() && !cancelled()` в джобе `deploy`: без него
деплой пропустится, если хоть одна из сборок была skipped (а так будет почти
всегда — меняется обычно что-то одно). Такая формула означает «запускайся, если
ничего не упало», считая пропущенные джобы нормой.

`git pull` на сервере нужен, чтобы подтянуть правки самой инфраструктуры
(`docker-compose.prod.yml`, конфиг nginx) — образы приложений приезжают из ghcr.

### 2.3. Секреты GitHub

В репозитории **Settings → Secrets and variables → Actions** добавь:

- `SSH_HOST` — IP сервера;
- `SSH_USER` — `root` (или созданный деплой-пользователь);
- `SSH_KEY` — приватный SSH-ключ, чей публичный лежит на сервере.

Секреты приложения (`JWT_SECRET`, API-ключи) в CI **не** передаются — они
остаются в `.env.prod` на сервере.

После этого релиз = `git push`. Через пару минут правка на стенде.
