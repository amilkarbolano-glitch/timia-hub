# Timia Hub — Despliegue (Docker · AWS)

Tres contenedores: **web** (nginx sirve el front y hace proxy de `/api`), **api** (FastAPI) y **mongo**.
El front no necesita CORS ni URL de API: habla con `/api` en el mismo origen.

## Local
```bash
cp .env.example .env
docker compose up -d --build
# http://localhost  ·  API docs: descomenta ports en api y abre http://localhost:8000/docs
```
La primera vez la API carga `public/db.json` (copiado en la imagen) en Mongo. Desde ahí la
base de datos es la fuente de verdad: lo que cambie cualquier usuario lo ven todos.

## AWS — opción simple (EC2 + docker compose)
1. EC2 Ubuntu 22.04 (t3.small basta), Security Group: 80/443 abiertos, 22 solo tu IP. **No abras 27017**.
2. `sudo apt update && sudo apt install -y docker.io docker-compose-v2 && sudo usermod -aG docker ubuntu`
3. `git clone <repo> && cd timia-hub && cp .env.example .env` (define `TIMIA_API_KEY` si quieres proteger la API).
4. `docker compose up -d --build`
5. HTTPS: pon un ALB con certificado ACM apuntando al puerto 80, o instala Caddy/Certbot en la instancia.
6. Backups de Mongo: `docker exec timia-mongo mongodump --archive > backup-$(date +%F).archive` (cron + S3).

## AWS — opción gestionada (ECS Fargate + DocumentDB/Atlas)
- Sube las dos imágenes a ECR (`docker build -f docker/web.Dockerfile -t timia-web .` y `docker build -t timia-api ./backend`).
- Servicio ECS con las dos tareas en la misma task definition (web escucha 80, api 8000); nginx resuelve `api` por `localhost` → cambia `proxy_pass http://api:8000` por `http://127.0.0.1:8000` en `docker/nginx.conf` o usa Service Connect.
- `MONGO_URL` apuntando a Atlas o DocumentDB (con TLS: `mongodb://user:pass@host:27017/?tls=true&tlsCAFile=...`).

## Variables
| Var | Dónde | Descripción |
|---|---|---|
| `MONGO_URL`, `MONGO_DB` | api | Conexión a Mongo (por defecto `mongodb://mongo:27017`, db `timia`) |
| `TIMIA_API_KEY` | api + front | Si está definida, la API exige header `X-API-Key`. En el front: `window.TIMIA_API_KEY` en `public/config.js` |
| `CORS_ORIGINS` | api | Solo necesario si el front NO pasa por nginx (ej. GitHub Pages hablando con la API) |
| `SEED_ON_START` | api | `true`: carga db.json en keys que no existan |
| `window.TIMIA_API_URL` | front (`public/config.js`) | `''` = mismo origen, `https://api.x.com` = otra URL, `'none'` = sin API |

## Modos del front
- **API** (badge verde "API · sincronizado" en el header): estado compartido en Mongo.
- **Local** (badge gris): sin API alcanzable → `db.json` + localStorage, como en GitHub Pages.

## Modelo de datos en Mongo
Cada key del front es una colección: `timia_admin_projects`, `timia_kanban_tasks`, `timia_plan_configs`,
`timia_plan_issues`, `timia_bitacora`, `timia_tr_features`, `timia_tr_entries`, … (arrays → un documento
por ítem con `_id` = `id`; objetos → documento en `kv`). Metadatos en `kv` (`kind`, `count`, `updatedAt`).
```js
use timia
db.timia_tr_entries.find({ "item.userId": "u-sergio" }).count()
```
