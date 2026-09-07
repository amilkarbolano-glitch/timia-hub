# Timia Hub API (FastAPI + MongoDB)

Persiste el estado del front: cada key `timia_*` es una colección en Mongo
(arrays → un documento por ítem; objetos → documento en `kv`).

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
