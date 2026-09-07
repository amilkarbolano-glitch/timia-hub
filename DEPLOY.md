# Timia Hub — Despliegue (Docker · AWS)

Son **dos piezas independientes** + base de datos, y quien despliega decide cómo combinarlas:

| Pieza | Carpeta | Imagen | Puede ir a |
|---|---|---|---|
| Front | raíz (`docker/web.Dockerfile`) | nginx + estáticos | S3+CloudFront, Amplify, ECS, EC2, GitHub Pages |
| API | `backend/` (autocontenido) | FastAPI | App Runner, ECS Fargate, EC2 — ver `backend/DEPLOY-API.md` |
| DB | — | mongo:7 o servicio | Atlas, DocumentDB, contenedor con volumen |

`docker-compose.yml` es la forma "todo junto en una máquina": **web** (nginx sirve el front y hace proxy de `/api`),
**api** y **mongo**. En ese modo el front no necesita CORS ni URL de API.
Si el front y la API viven en sitios distintos: `public/config.js` → `window.TIMIA_API_URL` y `CORS_ORIGINS` en la API.

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

## Autenticación (Google Sign-In)
1. En Google Cloud → **APIs y servicios → Credenciales → Crear credencial → ID de cliente OAuth → Aplicación web**.
   Orígenes JavaScript autorizados: `http://localhost` (pruebas) y `https://<dominio de la app>`. No hace falta URI de redirección.
2. En `.env`: `GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com`, `ALLOWED_EMAIL_DOMAINS=timia.ai`,
   `SESSION_SECRET=<openssl rand -base64 48>`, y `COOKIE_SECURE=true` cuando haya HTTPS.
3. Solo entran correos que existan en **Administración › Equipo** (`timia_admin_users`); el rol y los proyectos salen de ahí.
4. Con `GOOGLE_CLIENT_ID` definido, el login demo se apaga solo (`ALLOW_DEMO_LOGIN=true` lo fuerza para pruebas).

Cómo funciona: el botón de Google entrega un ID token → `POST /api/auth/google` lo verifica con Google → la API emite una
cookie de sesión **httpOnly** (JWT firmado, 8 h). Todas las rutas `/api/state*` exigen sesión; las colecciones de
configuración (usuarios, proyectos, roles, ANS, festivos) solo las escribe el rol **pm**. Rate limit en `/api/auth/*`.

## Variables
| Var | Dónde | Descripción |
|---|---|---|
| `MONGO_URL`, `MONGO_DB` | api | Conexión a Mongo (por defecto `mongodb://mongo:27017`, db `timia`) |
| `SESSION_SECRET`, `SESSION_HOURS`, `COOKIE_SECURE` | api | Firma y duración de la sesión; `COOKIE_SECURE=true` con HTTPS |
| `GOOGLE_CLIENT_ID`, `ALLOWED_EMAIL_DOMAINS`, `ALLOW_DEMO_LOGIN` | api | Google Sign-In y login demo |
| `TIMIA_API_KEY` | api | Acceso servicio-a-servicio (header `X-API-Key`), opcional |
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
