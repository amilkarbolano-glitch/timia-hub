# Timia Hub API (FastAPI + MongoDB)

Persiste el estado del front: cada key `timia_*` es una colección en Mongo
(arrays → un documento por ítem; objetos → documento en `kv`).

```
app/config.py      variables de entorno
app/db.py          Mongo (Motor), lectura/escritura por key, seed
app/security.py    sesión JWT en cookie httpOnly, API key, roles, rate limit
app/routers/auth   /api/auth/config · /google · /demo · /demo-accounts · /me · /logout
app/routers/state  /api/state · /api/state/{key} · /api/keys · /api/seed
```
Seguridad: toda la API exige sesión (cookie) o `X-API-Key`; escritura de colecciones administrativas solo rol `pm`;
`/api/seed` y `DELETE` solo `pm`; rate limit en auth; cookies `httpOnly` + `SameSite=Lax` (+ `Secure` con HTTPS).

```bash
# local sin docker
pip install -r requirements.txt
MONGO_URL=mongodb://localhost:27017 uvicorn app.main:app --reload --port 8000
# docs interactivas → http://localhost:8000/docs
```

Variables: `MONGO_URL`, `MONGO_DB` (timia), `TIMIA_API_KEY` (opcional, header `X-API-Key`),
`CORS_ORIGINS` (coma-separado, `*` por defecto), `SEED_ON_START` (true), `SEED_FILE`.

El seed es `seed/db.json` (copia de `public/db.json` del front; `npm run seed:sync` la actualiza). `backend/` es autocontenido: `docker build -t timia-api ./backend` funciona sin el resto del repo
y se carga solo en keys que no existan todavía (`POST /api/seed?force=true` para forzar).
