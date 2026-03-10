# Velora

Velora is a production-style marketplace platform MVP aimed at the operational and architectural standards of a serious regional commerce business. The repository is being built in staged increments so the platform grows with clean foundations instead of tutorial-style shortcuts.

## Why Velora exists

Velora is designed as a portfolio-grade commerce platform that demonstrates how a modern marketplace should be structured when correctness, scale direction, and maintainability all matter at the same time.

Current status on March 10, 2026:

- Stage 0 workspace foundation is complete.
- Stage 1 API, schema, and auth foundation is complete.
- Stage 2 storefront foundation is complete.
- Stage 3 catalog depth, listing experience, and product detail work is next.

## High-level architecture

- `apps/storefront`: Next.js App Router customer storefront.
- `apps/admin`: Next.js App Router admin and operator console.
- `apps/api`: NestJS backend API and commerce engine.
- `packages/ui`: shared UI primitives for the web apps.
- `packages/contracts`: shared API contracts and validation schemas.
- `packages/domain`: core enums, value objects, and domain-facing shared types.
- `packages/config`: shared environment schema helpers.
- `packages/test-utils`: deterministic test helpers and demo fixtures.
- PostgreSQL: transactional system of record.
- Redis: caching, rate limiting, and short-lived workflow state.
- OpenSearch: search and filtering projection store.

## Workspace structure

```text
apps/
  admin/
  api/
  storefront/
docs/
packages/
  config/
  contracts/
  domain/
  test-utils/
  ui/
```

## Local setup

1. Install Node.js 22+ and pnpm 10+.
2. Copy `.env.example` values into local `.env` files as needed.
3. Start infrastructure with `pnpm infra:up`.
4. Install dependencies with `pnpm install`.
5. Build internal packages once with `pnpm build:packages`.
6. Start the workspace with `pnpm dev`.

## Environment variables

Base variables currently expected:

- `NEXT_PUBLIC_STOREFRONT_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_API_URL`
- `PORT`
- `API_PREFIX`
- `DATABASE_URL` (defaults to local Postgres on port `5433`)
- `REDIS_URL`
- `OPENSEARCH_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

See [`.env.example`](/C:/Users/bogdan/Desktop/2026%20-%20PROJECTS/Velora/.env.example) for defaults used in local development.

## Infrastructure requirements

- PostgreSQL 16
- Redis 7
- OpenSearch 2
- Docker Compose for local orchestration

## Commands

- `pnpm dev`
- `pnpm dev:storefront`
- `pnpm dev:admin`
- `pnpm dev:api`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm infra:up`
- `pnpm infra:down`

## Seed instructions

Database migrations and seeds are wired through Prisma in `apps/api`.

1. Start infrastructure with `pnpm infra:up`.
2. Apply committed migrations with `pnpm db:migrate`.
3. Seed deterministic demo data with `pnpm db:seed`.

## Demo accounts

These accounts are reserved for seeded development data:

- `admin@velora.local / Demo123!`
- `seller@velora.local / Demo123!`
- `customer@velora.local / Demo123!`

## Testing instructions

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`

## Screenshots

Screenshots will be added once the storefront, admin, and checkout flows are functional.

## Future improvements

- Complete the commerce schema, migrations, and seed engine
- Add auth, catalog, inventory, reservations, checkout, and payments
- Add admin and seller management flows
- Add CI, observability, and performance review artifacts
