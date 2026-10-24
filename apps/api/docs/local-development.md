# Local development

## Purpose

This is the supported path from an empty machine to a listings JSON response. Commands are the ones in `apps/api/project.json`, `docker-compose.yml`, and the root README. The development password is not repeated here. It lives in `appsettings.Development.json` and in Compose, and those two files are meant to match.

## Prerequisites

- Node.js 22 or newer, and pnpm 12.14.0 (`packageManager` in the root `package.json`)
- The .NET 10 SDK, because the API targets `net10.0`
- Docker with Compose, for PostgreSQL

A PostgreSQL install on the host is not required. The API talks to the Compose port.

## Start the database

From the repository root:

```bash
docker compose up -d
```

That starts `business-marketplace-postgres` from `postgres:17`, publishes port 5432 unless `POSTGRES_PORT` is set, and creates the database named in the Compose file. `docker compose down` keeps the volume. `docker compose down -v` deletes it.

If `docker info` fails with `dockerDesktopLinuxEngine` missing, Docker Desktop is not running. Start it and wait until `docker info` prints a server version. Do not retry Compose until that works. Phase 4.10 stopped at that error. This documentation pass did not start Docker.

## Apply the schema

Startup does not migrate.

```bash
dotnet tool restore
dotnet tool run dotnet-ef database update --project apps/api/BusinessMarketplace.Api
```

The local tool version is recorded in `dotnet-tools.json` as `dotnet-ef` 10.0.13. The migration folder is `Data/Migrations`. The only migration is `20261018124056_InitialCreate`.

A new migration, when you intend a schema change:

```bash
dotnet tool run dotnet-ef migrations add <Name> --project apps/api/BusinessMarketplace.Api --output-dir Data/Migrations
```

## Seed

Stop a running API first on Windows. Then:

```bash
pnpm exec nx seed api
```

Details and the reset flag are in [seed data](seed-data.md).

## Run the API

```bash
pnpm exec nx serve api
```

That is `dotnet run` with launch profile `http` and `--urls http://localhost:5000`. The profile sets `ASPNETCORE_ENVIRONMENT` to Development. In that environment the process enables CORS for the origins in `FrontendCors:Origins` and serves the OpenAPI UI.

Check, once it is listening:

- `GET http://localhost:5000/api/health` returns 200 JSON `{ "status": "ok", "message": "API is running" }`. It does not need PostgreSQL.
- `GET http://localhost:5000/api/health/ready` needs the database.
- `GET http://localhost:5000/api/listings` returns a page of Active rows after the migration and the seed.
- The document UI is on the development host at the Swagger UI path registered in `Program.cs`. It reads `/openapi/v1.json`.

Angular is `nx serve angular-web` on port 4200. Vue is `nx serve vue-web` on port 4201. Those origins are the Development CORS allow-list. Port 4300, which Vite preview uses, is not on that list.

## Tests

```bash
pnpm exec nx test-unit api
pnpm exec nx test-integration api
pnpm exec nx build api
```

Integration tests need the Docker engine. They do not use the Compose database. See [testing](testing.md).

## Troubleshooting

**The process exits and says the connection string is not set.** Set `ConnectionStrings:DefaultConnection` or `ConnectionStrings__DefaultConnection`. The Development file already has a local value. An empty environment variable can override it with a blank.

**The process exits and says `FrontendCors:Origins` must list an origin.** That check runs only in Development. The Development JSON lists `http://localhost:4200` and `http://localhost:4201`.

**Connection refused to PostgreSQL.** `docker compose ps` should show the Postgres service. If port 5432 is taken, set `POSTGRES_PORT` and point `ConnectionStrings__DefaultConnection` at the same port.

**The browser reports a network error.** The API must be on port 5000. CORS headers are added only in Development, and only for the configured origins. `http://127.0.0.1:4200` is not the same origin as `http://localhost:4200`.

**Seed inserted nothing.** Those ids are already stored. That is the intended second run. Use `--seed --reset-generated` only when you mean to replace the generated 500.

**Build or test cannot copy the exe.** Stop `nx serve api` and run the command again.

## What this pass did not verify

Docker was not started. No migration was applied. No seed ran. No live HTTP status was recorded. The commands above are the ones the project files and `Program.cs` implement. A successful run is still a manual check.

## Key takeaways

Compose, then `database update`, then `nx seed api`, then `nx serve api`. Health does not prove the database. Ready and `GET /api/listings` do.
