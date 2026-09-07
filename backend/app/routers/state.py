"""Estado del front: una key `timia_*` por colección. Requiere sesión (o API key de servicio)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from .. import db
from ..security import Principal, can_write_key, current_principal, require_role

router = APIRouter(prefix="/api", tags=["state"])


class PutBody(BaseModel):
    value: Any


def valid_key(key: str) -> str:
    if not db.is_valid_key(key):
        raise HTTPException(status_code=400, detail="key inválida (debe empezar por timia_)")
    return key


@router.get("/state")
async def get_state(p: Principal = Depends(current_principal)):
    return {k: await db.read_key(k) for k in await db.list_keys()}


@router.get("/state/{key}")
async def get_key(key: str, p: Principal = Depends(current_principal)):
    v = await db.read_key(valid_key(key))
    if v is None:
        raise HTTPException(status_code=404, detail="key no encontrada")
    return v


@router.put("/state/{key}")
@router.post("/state/{key}")          # alias para navigator.sendBeacon
async def put_key(key: str, body: PutBody, p: Principal = Depends(current_principal)):
    valid_key(key)
    if not can_write_key(p, key):
        raise HTTPException(status_code=403, detail="Solo el PM puede modificar la configuración administrativa")
    await db.write_key(key, body.value, by=p.id)
    return {"key": key, "updatedAt": db.now_iso()}


@router.delete("/state/{key}")
async def delete_key(key: str, p: Principal = Depends(require_role("pm"))):
    await db.delete_key(valid_key(key))
    return {"key": key, "deleted": True}


@router.get("/keys")
async def keys(p: Principal = Depends(current_principal)):
    return await db.list_meta()


@router.post("/seed")
async def seed(force: bool = Query(default=False), p: Principal = Depends(require_role("pm"))):
    return await db.seed_from_file(force)
