# syntax=docker/dockerfile:1
#
# Build context is the repository root, because the workspace lockfile lives
# there and a reproducible install needs it.

FROM node:22-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/

RUN npm ci --workspace apps/frontend --include-workspace-root

FROM deps AS build
WORKDIR /repo

COPY apps/frontend ./apps/frontend

# Vite inlines this at build time, so it is a build argument rather than a
# runtime variable. Changing the API host means rebuilding the image.
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build --workspace apps/frontend

# ---------------------------------------------------------------
# runtime: static files behind nginx
#
# nginx-unprivileged rather than the stock nginx image: the stock one starts
# its master process as root and drops privileges for workers, which a static
# file server has no need to do.
# ---------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY infra/docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

# The app is built with Vite base "/api3dash/" and its router uses the same
# base, so the files are served from a matching path on disk.
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html/api3dash

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/bin/sh", "-c", "wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1"]
