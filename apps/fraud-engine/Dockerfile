# syntax=docker/dockerfile:1
#
# Build context is the repository root, because the workspace lockfile lives
# there and a reproducible install needs it.

# ---------------------------------------------------------------
# deps: dependencies only, so this layer is cached until a
# manifest changes rather than on every source edit.
# ---------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/fraud-engine/package.json apps/fraud-engine/

RUN npm ci --workspace apps/fraud-engine --include-workspace-root

# ---------------------------------------------------------------
# build: compile TypeScript to dist/
# ---------------------------------------------------------------
FROM deps AS build
WORKDIR /repo

COPY apps/fraud-engine ./apps/fraud-engine
RUN npm run build --workspace apps/fraud-engine

# ---------------------------------------------------------------
# migrate: the schema runner. Keeps dev dependencies because it
# runs the TypeScript directly through ts-node, and the SQL and
# Cypher files it applies are data rather than compiled output.
# ---------------------------------------------------------------
FROM deps AS migrate
WORKDIR /repo

COPY apps/fraud-engine/database ./apps/fraud-engine/database
COPY apps/fraud-engine/tsconfig.json ./apps/fraud-engine/

USER node
CMD ["npm", "run", "db:migrate", "--workspace", "apps/fraud-engine"]

# ---------------------------------------------------------------
# runtime: production dependencies and compiled output only
# ---------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /repo

ENV NODE_ENV=production \
    PORT=4000

COPY package.json package-lock.json ./
COPY apps/fraud-engine/package.json apps/fraud-engine/

RUN npm ci --omit=dev --workspace apps/fraud-engine --include-workspace-root \
 && npm cache clean --force

COPY --from=build /repo/apps/fraud-engine/dist ./apps/fraud-engine/dist

# The node user ships with the base image; nothing here needs root.
USER node

EXPOSE 4000

# The service has no health endpoint yet, so this proves only that the
# process is listening and serving. It gets replaced by a real readiness
# check -- one that reports on SQL Server, Redis and Neo4j -- when
# @nestjs/terminus lands.
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/fraud-engine/dist/main.js"]
