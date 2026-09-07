# Desplegar solo la API (independiente del front)

`backend/` es autocontenido. Cualquiera de estas opciones sirve; el front solo necesita la URL resultante.

## Imagen
```bash
docker build -t timia-api ./backend
docker run -p 8000:8000 -e MONGO_URL=mongodb://host:27017 -e TIMIA_API_KEY=secreto timia-api
```

## Opciones en AWS
| Opción | Cuándo | Notas |
|---|---|---|
| **App Runner** | lo más simple, sin gestionar servidores | imagen en ECR; env `MONGO_URL` (Atlas/DocumentDB) |
| **ECS Fargate** | equipo ya usa ECS | task con la imagen, ALB delante, target `/api/health` |
| **EC2 + docker** | control total / costo mínimo | `docker run` o el `docker-compose.yml` de la raíz |
| **Lambda** | no recomendado | FastAPI con Mangum funciona, pero Motor/Mongo en Lambda suma latencia y cold starts |

## Base de datos
- **MongoDB Atlas** (recomendado si no quieren operar Mongo): `MONGO_URL=mongodb+srv://user:pass@cluster/...`
- **Amazon DocumentDB**: compatible; usar `?tls=true&tlsCAFile=global-bundle.pem` y `retryWrites=false`
- **Contenedor mongo:7** con volumen (lo que hace `docker-compose.yml`)

## Variables
`MONGO_URL`, `MONGO_DB` (timia), `TIMIA_API_KEY` (recomendado en internet), `CORS_ORIGINS` (dominio del front si NO está detrás del mismo nginx), `SEED_ON_START` (true la primera vez).

## Cómo lo consume el front
- Mismo origen (nginx del front proxea `/api`): no hay que configurar nada.
- API en otra URL: en `public/config.js` del front → `window.TIMIA_API_URL = 'https://api.midominio.com'` (y `TIMIA_API_KEY` si aplica) + `CORS_ORIGINS` en la API.
