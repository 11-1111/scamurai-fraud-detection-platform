# syntax=docker/dockerfile:1
#
# Build context is the repository root, because the workspace lockfile lives
# there and a reproducible install needs it.

FROM node:22-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/bff/package.json apps/bff/

RUN npm ci --workspace apps/bff --include-workspace-root

FROM deps AS build
WORKDIR /repo

COPY apps/bff ./apps/bff
RUN npm run build --workspace apps/bff

FROM node:22-alpine AS runtime
WORKDIR /repo

ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./
COPY apps/bff/package.json apps/bff/

RUN npm ci --omit=dev --workspace apps/bff --include-workspace-root \
 && npm cache clean --force

COPY --from=build /repo/apps/bff/dist ./apps/bff/dist

USER node

EXPOSE 3000

# The BFF answers GET / from its app controller, so this check is a genuine
# request through the stack rather than a port probe.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/bff/dist/main.js"]
