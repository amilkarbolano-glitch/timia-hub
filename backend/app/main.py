"""
Timia Hub — API de estado (FastAPI + MongoDB)

Cada key `timia_*` del front es una colección de Mongo:
  · valor array   → un documento por ítem (con `_id` = item.id si existe, si no el índice)
  · valor objeto  → un único documento en la colección `kv` con `_id` = key
Así el equipo puede consultar Mongo directamente (db.timia_kanban_tasks.find()) y el
front sigue trabajando con el mismo modelo de datos que ya tenía.

Endpoints:
  GET    /api/health
  GET    /api/state              → { key: value, ... } (todas las keys)
  GET    /api/state/{key}        → value
  PUT    /api/state/{key}        → body { "value": ... } (reemplaza la key completa)
  DELETE /api/state/{key}
  POST   /api/seed?force=false   → carga seed/db.json en las keys vacías (o todas si force)
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
MONGO_DB = os.getenv("MONGO_DB", "timia")
API_KEY = os.getenv("TIMIA_API_KEY", "")          # vacío = sin autenticación
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
_HERE = Path(__file__).resolve().parent.parent
_SEED_CANDIDATES = [_HERE / "seed" / "db.json", _HERE.parent / "public" / "db.json"]   # imagen Docker · repo local
SEED_FILE = Path(os.getenv("SEED_FILE") or next((str(p) for p in _SEED_CANDIDATES if p.exists()), str(_SEED_CANDIDATES[0])))
KEY_PREFIX = "timia_"
KV = "kv"

app = FastAPI(title="Timia Hub API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

client: AsyncIOMotorClient | None = None


def db():
    assert client is not None
    return client[MONGO_DB]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def require_key(x_api_key: str | None = Header(default=None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")


def valid_key(key: str) -> str:
    if not key.startswith(KEY_PREFIX) or not key.replace("_", "").replace("-", "").replace(":", "").isalnum() or len(key) > 120:
        raise HTTPException(status_code=400, detail="key inválida (debe empezar por timia_)")
    return key


# ─── Lectura / escritura de una key ──────────────────────────────────────────

async def read_key(key: str) -> Any | None:
    d = db()
    meta = await d[KV].find_one({"_id": key})
    if meta is None:
        return None
    if meta.get("kind") == "array":
        docs = await d[key].find({}, {"_ord": 1, "item": 1}).sort("_ord", 1).to_list(length=None)
        return [x["item"] for x in docs]
    return meta.get("value")


async def write_key(key: str, value: Any) -> None:
    d = db()
    if isinstance(value, list):
        await d[key].delete_many({})
        if value:
            docs = []
            for i, item in enumerate(value):
                _id = item.get("id") if isinstance(item, dict) and isinstance(item.get("id"), (str, int)) else i
                docs.append({"_id": str(_id), "_ord": i, "item": item})
            # ids duplicados → índice
            seen, uniq = set(), []
            for doc in docs:
                if doc["_id"] in seen:
                    doc["_id"] = f"{doc['_id']}#{doc['_ord']}"
                seen.add(doc["_id"]); uniq.append(doc)
            await d[key].insert_many(uniq)
        await d[KV].replace_one({"_id": key}, {"_id": key, "kind": "array", "count": len(value), "updatedAt": now()}, upsert=True)
    else:
        await d[key].drop()
        await d[KV].replace_one({"_id": key}, {"_id": key, "kind": "value", "value": value, "updatedAt": now()}, upsert=True)


async def list_keys() -> list[str]:
    return [m["_id"] async for m in db()[KV].find({}, {"_id": 1})]


async def seed_from_file(force: bool) -> dict:
    if not SEED_FILE.exists():
        return {"seeded": [], "skipped": [], "note": f"sin seed file en {SEED_FILE}"}
    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    existing = set(await list_keys())
    seeded, skipped = [], []
    for k, v in data.items():
        if not k.startswith(KEY_PREFIX):
            continue
        if k in existing and not force:
            skipped.append(k); continue
        await write_key(k, v); seeded.append(k)
    return {"seeded": seeded, "skipped": skipped}


# ─── Ciclo de vida ───────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    global client
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    await db()[KV].create_index("updatedAt")
    if os.getenv("SEED_ON_START", "true").lower() == "true":
        res = await seed_from_file(force=False)
        if res["seeded"]:
            print(f"[seed] keys cargadas: {', '.join(res['seeded'])}")


@app.on_event("shutdown")
async def shutdown():
    if client:
        client.close()


# ─── Endpoints ───────────────────────────────────────────────────────────────

class PutBody(BaseModel):
    value: Any


@app.get("/api/health")
async def health():
    try:
        await client.admin.command("ping")  # type: ignore[union-attr]
        return {"ok": True, "db": MONGO_DB, "keys": len(await list_keys()), "time": now()}
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=503, detail=f"mongo no disponible: {e}")


@app.get("/api/state", dependencies=[Depends(require_key)])
async def get_state():
    out = {}
    for k in await list_keys():
        out[k] = await read_key(k)
    return out


@app.get("/api/state/{key}", dependencies=[Depends(require_key)])
async def get_key(key: str):
    v = await read_key(valid_key(key))
    if v is None:
        raise HTTPException(status_code=404, detail="key no encontrada")
    return v


@app.put("/api/state/{key}", dependencies=[Depends(require_key)])
@app.post("/api/state/{key}", dependencies=[Depends(require_key)])   # alias para navigator.sendBeacon
async def put_key(key: str, body: PutBody):
    await write_key(valid_key(key), body.value)
    return {"key": key, "updatedAt": now()}


@app.delete("/api/state/{key}", dependencies=[Depends(require_key)])
async def delete_key(key: str):
    valid_key(key)
    await db()[key].drop()
    await db()[KV].delete_one({"_id": key})
    return {"key": key, "deleted": True}


@app.post("/api/seed", dependencies=[Depends(require_key)])
async def seed(force: bool = Query(default=False)):
    return await seed_from_file(force)


@app.get("/api/keys", dependencies=[Depends(require_key)])
async def keys():
    d = db()
    return [m async for m in d[KV].find({}, {"_id": 1, "kind": 1, "count": 1, "updatedAt": 1})]
