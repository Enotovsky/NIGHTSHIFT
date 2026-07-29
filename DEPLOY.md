# Деплой NIGHTSHIFT на VDS (Docker)

Сайт собран на **vinext** (Vite + Next.js). В проде `vinext start` поднимает
обычный **Node.js HTTP-сервер** (`node:http`) — Cloudflare Workers / workerd на
VDS не нужны. Контейнер внутри слушает порт **3000**, наружу публикуется порт из
`.env` (`APP_PORT`, по умолчанию **8100**).

## Что добавлено в проект

| Файл                 | Назначение                                              |
| -------------------- | ------------------------------------------------------- |
| `Dockerfile`         | Multi-stage сборка: `npm ci` + `vinext build` → runtime |
| `docker-compose.yml` | Сервис `nightshift`, публикация `${APP_PORT:-8100}:3000`|
| `.dockerignore`      | Исключает node_modules/dist/.git из контекста сборки    |
| `.env.example`       | Шаблон env — переменная `APP_PORT`                      |

## Шаги деплоя

1. Скопировать папку `nightshift-focus/` на VDS (например через `scp`/`rsync`
   или `git`). Локальные `node_modules/` и `dist/` копировать не нужно — они
   пересоберутся в контейнере (и исключены `.dockerignore`).

2. На VDS в папке проекта создать `.env` из шаблона и при желании поменять порт:

   ```bash
   cp .env.example .env
   # при необходимости: nano .env  -> APP_PORT=8100
   ```

3. Собрать и запустить:

   ```bash
   docker compose up -d --build
   ```

4. Проверить, что контейнер поднялся и отвечает:

   ```bash
   docker compose ps
   curl -I http://127.0.0.1:8100/
   ```

   Ожидается `HTTP/1.1 200 OK` и заголовок страницы
   «NIGHTSHIFT — ночной рабочий клуб в Москве».

## Смена порта

Порт публикации задаётся **только** через `.env`:

```env
APP_PORT=8100
```

Внутренний порт контейнера (3000) менять не нужно. Если 8100 занят одним из
4 существующих сайтов — впиши свободный, затем `docker compose up -d`.

## Подключение к домену / reverse proxy

Сейчас контейнер просто отдаёт порт на VDS (маршрутизацию ты настраиваешь сам,
как договаривались). Когда будешь заводить домен, направь свой reverse proxy
(nginx/Traefik/др.) на `http://127.0.0.1:${APP_PORT}`. Пример nginx server-блока:

```nginx
server {
    listen 80;
    server_name nightshift.example.com;

    location / {
        proxy_pass http://127.0.0.1:8100;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Если сайты ходят в общую docker-сеть (напр. под nginx-proxy/Traefik), скажи —
добавлю в `docker-compose.yml` нужную `networks:` / labels, и тогда порт наружу
можно вообще не публиковать.

## Обновление сайта

После изменений в коде:

```bash
docker compose up -d --build
```

Старый контейнер заменится новым (`restart: unless-stopped` перезапустит его
при падении/ребуте VDS).

## Полезное

- Логи:      `docker compose logs -f nightshift`
- Остановка: `docker compose down`
- Healthcheck встроен в compose (пингует `/` внутри контейнера).
