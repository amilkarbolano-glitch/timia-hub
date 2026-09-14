# ── Build del front (Vite) ────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
# VITE_API_URL vacío ⇒ mismo origen (/api) — nginx hace proxy al backend
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build:client

# ── Servidor estático + proxy ─────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://localhost/ >/dev/null || exit 1
