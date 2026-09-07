"""Arranca la API con un Mongo en memoria (mongomock) — útil para probar sin Docker ni Mongo.
   pip install mongomock-motor && python backend/dev_mock.py  → http://localhost:8000/docs"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import app.main as m
from mongomock_motor import AsyncMongoMockClient
m.AsyncIOMotorClient = lambda *a, **k: AsyncMongoMockClient()
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(m.app, host="0.0.0.0", port=int(sys.argv[1]) if len(sys.argv) > 1 else 8000, log_level="warning")
