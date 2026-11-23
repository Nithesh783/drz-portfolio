# Portfolio-DRZ

An educational portfolio migration demo built as an npm-workspaces monorepo. The original source content and design are credited to Rafael Conde; attribution remains with the original author. Replace the portfolio profile using `frontend/src/data/siteConfig.ts` when customizing the demo.

## Technology stack

- Frontend: Next.js App Router, React, and TypeScript.
- Backend: NestJS and TypeScript.
- Database: PostgreSQL, accessed through Prisma.
- Package management: npm workspaces.

## Configuration and security

- Use the root `.env` for backend and Prisma host-based development, and `.env.docker` for Docker Compose. Next.js reads its local environment from `frontend/`; its defaults target localhost. For frontend URL overrides, set them in the ignored `frontend/.env.local` or export them before starting the frontend.
- Environment examples use placeholder credentials and non-production defaults. Replace credentials and deployment-specific settings in the ignored local environment files before starting services.
- Never commit database connection strings, passwords, JWT secrets, storage keys, or private deployment configuration. Do not put secrets in `NEXT_PUBLIC_*` variables; those values are exposed to browser code.
- `.gitignore` and `.dockerignore` exclude local environment files, logs, and common private-key files. Docker Compose injects required values at runtime.
- The Compose database has no published host port. Host-bound application and RustFS ports default to loopback; do not expose management or storage ports publicly. Use a properly secured reverse proxy for any public deployment.

## Requirements

- Node.js 20.19 or newer
- npm
- PostgreSQL 13 or newer
- RustFS for image storage (or Docker to run the included RustFS service)

## Install

```bash
npm install
test -f .env || cp .env.example .env
```

Set `DATABASE_URL` in `.env` to a local PostgreSQL database. Set `JWT_SECRET` to a private random value of at least 32 bytes and replace the RustFS placeholders with private values:

```bash
openssl rand -base64 48
```

For custom frontend URLs during host-based development, create `frontend/.env.local` with the frontend-specific settings:

```dotenv
API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Create the database if it does not exist, then initialize the schema:

```bash
createdb "drz-portfolio"
npm run db:generate
npm run db:migrate
```

The migration creates `projects`, `enquiries`, and `admin_accounts`. Project image references use a `TEXT[]` with a database check allowing at most one non-empty reference. Enquiry project references use `ON DELETE SET NULL`. Add portfolio projects through the admin after creating an administrator. Run `npm run db:studio` to open Prisma Studio; this command loads `DATABASE_URL` from the root `.env`. Admin image uploads accept JPEG, PNG, or WebP up to 5 MB and are stored in the configured RustFS bucket; PostgreSQL stores only object keys.

**Legacy database warning:** if `drz_portfolio` already contains the earlier portfolio schema or data, do not run `npm run db:migrate` yet. The migration state and old records must be inspected and reconciled first. Back up that database before applying any conversion.

Create an administrator from a terminal:

```bash
npm run admin:create
```

The command prompts for name, email, a hidden password, and password confirmation. You can run it repeatedly to create multiple administrators; each account must use a unique email address. Passwords are stored as salted scrypt hashes. There is no public admin registration route.

## Run both applications

Start the configured native RustFS service before starting the backend, or use another S3-compatible service configured in `.env`.

```bash
npm run rustfs:start
```

In another terminal:

```bash
npm run dev
```

- Next.js frontend: the local address printed at startup (port `3000` by default).
- NestJS API: port `API_PORT` (default `4000`); health route `/health`.
- Frontend-to-backend health route: `/api/health`.
- Admin login: `/admin` (redirects to `/admin/login` when unauthenticated).
- All projects: `/projects`.
- Enquiry form: `/contact`.

## Build

```bash
npm run build
```

The backend build generates the Prisma client before compiling. Start the production builds with `npm run start`.

Run either workspace by itself with `npm run dev:frontend` or `npm run dev:backend`.

## Run with Docker

Docker Compose builds the frontend and backend as separate multi-stage images and starts PostgreSQL and RustFS with persistent storage. The frontend also joins the external `dokploy-network`; create it for standalone Compose use if it does not already exist. A Dokploy deployment should use its existing trusted network.

Create `.env.docker` only if you do not already have one. Edit it locally and replace every placeholder; do not commit the file:

```bash
test -f .env.docker || cp .env.docker.example .env.docker
docker network inspect dokploy-network >/dev/null 2>&1 || docker network create dokploy-network
```

Generate four independent hex-only values. Keep the output private and place it only in `.env.docker`:

```bash
openssl rand -hex 24
openssl rand -hex 32
openssl rand -hex 24
openssl rand -hex 32
```

Use the generated values, in order, for `POSTGRES_PASSWORD`, `JWT_SECRET`, `RUSTFS_ACCESS_KEY`, and `RUSTFS_SECRET_KEY`. Do not reuse administrator credentials. The frontend host port, backend host port, and RustFS host ports are controlled by `.env.docker`. By default, host bindings use loopback. PostgreSQL is available only to services on the private Compose network and is not published to the host.

To preview the frontend from a phone on a trusted Wi-Fi network, temporarily expose only the frontend port on the LAN:

```bash
FRONTEND_BIND_ADDRESS=0.0.0.0 docker compose --env-file .env.docker up -d --no-deps --force-recreate frontend
```

Open `http://<computer-LAN-IP>:<FRONTEND_HOST_PORT>` on the phone. Browser API requests are proxied through the frontend, so the backend remains loopback-bound and its port does not need to be exposed. Restore the frontend to loopback afterward by running the same Compose command without the `FRONTEND_BIND_ADDRESS` prefix.

Apply Prisma migrations explicitly before starting the application. For an existing database, back it up and inspect its migration history first; do not apply the initial migration blindly to a legacy schema. This command starts PostgreSQL if needed and does not seed demo projects:

```bash
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker --profile tools run --rm db-migrate
docker compose --env-file .env.docker up --build -d
```

Create an admin interactively inside the running backend container:

```bash
docker compose --env-file .env.docker exec backend node dist/scripts/create-admin.js
```

Common operations:

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f
docker compose --env-file .env.docker stop
docker compose --env-file .env.docker restart
docker compose --env-file .env.docker down
```

Rebuild and restart one service at a time:

```bash
docker compose --env-file .env.docker build frontend
docker compose --env-file .env.docker up -d --no-deps frontend

docker compose --env-file .env.docker build backend
docker compose --env-file .env.docker up -d --no-deps backend
```

Open the frontend using the host port configured by `FRONTEND_HOST_PORT`. The API health route is `/health` on the configured backend host port. RustFS host ports are controlled by `RUSTFS_HOST_PORT` and `RUSTFS_CONSOLE_HOST_PORT`; the API and console stay bound to `127.0.0.1`. Inside Docker, the backend connects to PostgreSQL and RustFS over the private Compose network, and the frontend server connects to the backend. RustFS credentials are passed only to RustFS and the backend. Project images and PostgreSQL data use persistent named volumes; `docker compose down` preserves them, while `docker compose down -v` deletes them.

## Monorepo structure

- `frontend/src/app/` — Next.js routes, layouts, and route handlers.
- `frontend/src/components/` — shared portfolio, contact, and admin UI.
- `frontend/src/sections/`, `frontend/src/data/`, and `frontend/src/lib/` — page composition, portfolio content, API clients, and parsing helpers.
- `frontend/public/` — static assets served directly by Next.js.
- `backend/src/modules/` — active NestJS modules for health, admin, projects, and enquiries.
- `backend/src/generated/` — generated Prisma client output; recreated by `npm run db:generate` and excluded from Git.
- `backend/prisma/` — Prisma schema and migrations.
- `backend/scripts/` — Prisma CLI and administrator bootstrap helpers.
- Root configuration — npm workspaces, shared environment example, and development/build scripts.

## Data and APIs

- `GET /projects` returns every project to the public portfolio; the home page uses its existing limited selection, while `/projects` shows all records.
- `POST /enquiries` accepts validated public contact form submissions.
- `/admin/projects` and `/admin/enquiries` are protected by an HTTP-only admin session cookie.
- `POST /admin/projects/images` is a protected direct-image-upload endpoint; images are delivered by the backend at `/media?key=...`.
- `POST /admin/auth/login` and `POST /admin/auth/logout` manage the session; `GET /admin/auth/me` validates it.
- Admin pages are not linked from the public portfolio and are entered directly through `/admin`.

Set `DATABASE_URL`, `JWT_SECRET` (at least 32 bytes), and the RustFS settings in the appropriate ignored environment file. Host-based development and Docker Compose use different endpoint configurations; use the values in their respective examples. The backend creates the configured bucket if it does not exist. RustFS credentials stay backend-side and must never be exposed through `NEXT_PUBLIC_*` variables. `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` are browser-visible/build-time configuration, not secrets; set them in `frontend/.env.local` for host-based Next.js development or `.env.docker` for Docker, and rebuild the frontend after changing production values. Do not put private or production origins in this README.

## RustFS and image migration

For native macOS RustFS, install the standalone binary using the official RustFS macOS installation documentation, then start it from the project root whenever you work locally:

```bash
npm run rustfs:start
```

The command reads RustFS credentials from `.env` and uses `$HOME/rustfs/data` for persistent local storage. Keep the terminal open while it runs. The native API and console bind to loopback using the ports specified in the start script. Stop the native server with Ctrl+C. Do not run native and Docker RustFS at the same time because they use the same local ports.

Migrate legacy project image references before removing any original files. The migration is safe to rerun, verifies each upload, updates only project records that still match their pre-migration values, and never deletes source files. For local development:

```bash
npm run db:migrate
npm run images:migrate -- --dry-run
npm run images:migrate
```

If the preflight reports missing legacy source files, restore them before the
normal migration. To migrate only the available sources and leave missing
references unchanged for later repair, explicitly use
`--skip-missing-sources` for both the dry run and migration.

For Docker, mount the legacy upload directory read-only for the one-off migration command:

```bash
docker compose --env-file .env.docker run --rm \
  -v "$PWD/backend/uploads:/app/backend/uploads:ro" \
  -e LEGACY_UPLOADS_DIRECTORIES=/app/backend/uploads \
  backend node dist/scripts/migrate-project-images.js --dry-run
```

Remove `--dry-run` after reviewing the preflight output. The checked-in building image and favicon remain static frontend assets and are not migrated.
If a previous deployment stored uploads in a named Docker volume instead of `backend/uploads`, mount that volume read-only at a second path and add both paths to `LEGACY_UPLOADS_DIRECTORIES`. By default, the migration fails before database changes if any referenced source image is missing; the explicit `--skip-missing-sources` option leaves those references unchanged and reports them.

## Source attribution

The portfolio content and design are adapted from [Rafael Conde's original project](https://github.com/rafaelconde/rafaelconde). This repository is an educational framework-migration demo, not a claim of authorship of the original portfolio.


