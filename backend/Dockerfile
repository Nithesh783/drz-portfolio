FROM node:24-bookworm-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

RUN npm ci --workspace=@portfolio-drz/backend --include-workspace-root=false

FROM deps AS build

COPY . .

ARG PRISMA_GENERATE_DATABASE_URL

RUN DATABASE_URL="${PRISMA_GENERATE_DATABASE_URL}" \
    npm run build --workspace=@portfolio-drz/backend \
    && test -f /app/backend/dist/scripts/create-admin.js \
    && test -f /app/backend/dist/scripts/migrate-project-images.js

USER node

FROM base AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

RUN npm ci --omit=dev --workspace=@portfolio-drz/backend --include-workspace-root=false

FROM base AS runtime

WORKDIR /app

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --from=build --chown=node:node /app/frontend/public/assets ./frontend/public/assets

WORKDIR /app/backend

USER node

CMD ["node", "dist/main.js"]
