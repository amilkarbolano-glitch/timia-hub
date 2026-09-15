# Checklist de despliegue en AWS — Timia Hub

Estado al 15-sep-2026. ✅ listo · 🟡 decisión/acción pendiente · ⛔ bloqueante.

## 1. Código y repositorios
- ✅ `timia-hub` (front) y `timia-hub-api` (API) en GitHub, ramas `main` (estable) y `develop`.
- ✅ `Dockerfile` en la raíz de ambos; `docker compose up -d --build` probado en local.
- ✅ CI en cada push: pruebas (API 29, front smoke/e2e) y build de imágenes.
- ✅ `.env.example` en ambos repos con todas las variables documentadas.

## 2. Infraestructura (CloudFormation, convención de DevOps)
- ✅ `timia-hub-api/infrastructure_dev_base.yml` — VPC, subredes, NAT, DocumentDB, secreto `MONGO_URL`.
- ✅ `timia-hub-api/infrastructure.yml` — ECR, ECS Fargate, ALB, logs, secretos de la app.
- ✅ `timia-hub/infrastructure.yml` — Amplify Hosting desde GitHub (rama por ambiente).
- ✅ `INFRA-AWS.md` con el orden de los stacks y parámetros.
- 🟡 **DevOps decide**: DocumentDB (como está) vs. MongoDB Atlas; Fargate (como está) vs. otra opción. Solo cambia el stack afectado.
- 🟡 **Dominio y certificado**: `app.<dominio>` (front) y `api.<dominio>` (ALB) con ACM. Sin HTTPS en la API las cookies de sesión NO funcionan entre Amplify y el ALB (solo pruebas con `COOKIE_SECURE=false`). ⛔ para producción.
- 🟡 Tras crear el stack de la API: publicar la imagen (workflow `deploy-aws.yml` con `AWS_ROLE_ARN` + `AWS_DEPLOY_ENABLED=true`, o `docker push` manual).
- 🟡 Actualizar `FrontendOrigin` en el stack de la API con la URL final del front (CORS + cookies).

## 3. Autenticación
- ✅ Firebase Authentication con Google funcionando (proyecto `timtionary`), API verifica el token.
- ✅ Solo entran correos `@timia.ai` registrados en el panel; los demás quedan como solicitud de acceso para aprobar.
- 🟡 En Firebase → Authentication → Settings → **Authorized domains**: agregar el dominio del front en AWS (hoy solo `localhost`).
- 🟡 Restringir la `apiKey` de Firebase en Google Cloud a los dominios de la app (buena práctica, no bloqueante).
- 🟡 `SESSION_SECRET` de producción (distinto al local) en el parámetro del stack.
- 🟡 Decidir si `ALLOW_DEMO_LOGIN` va en `false` explícito en producción (con Firebase ya se apaga solo).

## 4. Datos
- ✅ Seed del piloto (Migración BD a ADA, 5 usuarios) se carga solo la primera vez que arranca la API con Mongo vacío.
- 🟡 Cargar el estado real del piloto (avance de tareas, bloqueos históricos) — hoy el plan está en 0 %.
- 🟡 Backups: DocumentDB los hace solo (1 día en dev, 7 en prd, ya en la plantilla). Con Atlas, activar backups allí.
- 🟡 Migrar lo que ya se haya trabajado en el Docker local: `mongodump` del contenedor → `mongorestore` a la base de AWS (te lo hago cuando exista).

## 5. Seguridad / operación
- ✅ Sesión httpOnly, permisos por rol y proyecto validados en el servidor, rate limit en login, cabeceras de seguridad en nginx.
- 🟡 Repo `timia-hub` es público con `db.json` (nombres/correos del equipo) y GitHub Pages activo → **pasar a privado y/o apagar Pages** cuando AWS esté arriba.
- 🟡 Alarmas mínimas en CloudWatch (API no saludable, errores 5xx) — lo puede dejar DevOps con el stack.
- 🟡 Concurrencia: guardado por colección ("último gana"). Suficiente para arrancar con el piloto; mejorar a guardado por ítem antes de abrir a todo el equipo.

## 6. Orden sugerido
1. DevOps crea stack base → stack API → publica imagen → stack front (Amplify).
2. Dominio + certificado + listener 443; actualizar `ApiUrl`/`FrontendOrigin`; dominio en Firebase.
3. Entrar con Google, aprobar accesos del equipo, cargar el estado real del piloto.
4. Privatizar repo / apagar Pages.
