FROM node:24-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

RUN npm ci --workspace=@portfolio-drz/frontend --include-workspace-root=false

FROM deps AS build

COPY . .

ARG API_BASE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL

RUN API_BASE_URL="${API_BASE_URL}" \
    NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
    NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL}" \
    npm run build --workspace=@portfolio-drz/frontend

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /app/frontend/public ./frontend/public

WORKDIR /app/frontend

USER node

CMD ["node", "server.js"]
