# Velora

Velora is a production-style marketplace platform MVP built to demonstrate how a serious commerce system should be structured when catalog scale, transactional correctness, operational tooling, and product polish all matter at the same time.

It combines a public storefront, customer account area, admin backoffice, seller workspace, and a NestJS commerce API inside a pnpm monorepo. The implementation favors realistic marketplace behavior over tutorial shortcuts: server-side pricing, stock reservation during checkout, replay-safe payment handling, projection-based search, role-aware operations, and deterministic seed data.

## Why Velora exists

Velora exists as a portfolio-grade marketplace platform that feels credible in an interview, review, or architecture discussion. The goal is not to mimic every enterprise subsystem, but to show disciplined decisions around:

- stateless application services
- explicit domain boundaries
- idempotent payment and webhook flows
- concurrency-safe inventory handling
- search as a recoverable projection
- admin and seller role separation
- documentation, tests, and CI that match the codebase

## What is built

- Public storefront with home, navigation, category pages, search, filters, sorting, product detail, cart, checkout, and confirmation.
- Customer account area with profile management, addresses, order history, order detail, payment timeline, and refund visibility basics.
- Admin backoffice with dashboard metrics, category CRUD, product CRUD, inventory management, order operations, funding-aware promotion management, customer lookup, seller controls, reindex, and reservation cleanup.
- Seller workspace with scoped dashboard, listing visibility, a dedicated seller-funded promotions console, inventory updates, seller-order visibility, and approval-based merchant activation.
- Cross-role in-app notifications for customers, sellers, and admins covering onboarding, orders, refunds, and operational alerts.
- NestJS commerce API with cookie session auth, role guards, catalog/search, cart, checkout, payments, funding-aware promotions, settlement snapshots, orders, audit logging, and operational endpoints.
- PostgreSQL transactional model, Redis-backed cache and rate limiting, OpenSearch-backed search projection with persisted fallback documents, and Stripe sandbox support.
- Deterministic seed data for demo accounts, sellers, catalog, promotions, inventory, orders, and operational edge cases.
- Vitest coverage for critical business logic plus Playwright browser flows for storefront, admin, and seller journeys.

## High-level architecture

- `apps/storefront`: Next.js App Router customer-facing storefront and account experience.
- `apps/admin`: Next.js App Router backoffice for operators and promotion/catalog management.
- `apps/api`: NestJS API and commerce engine.
- `packages/ui`: shared UI primitives and layout helpers for the frontend apps.
- `packages/contracts`: shared Zod schemas and TypeScript contracts used by API and frontend.
- `packages/domain`: shared enums and domain-facing primitives.
- `packages/config`: shared environment schema helpers.
- `packages/test-utils`: deterministic fixtures and reusable test helpers.
- PostgreSQL: transactional source of truth for identity, catalog, carts, checkout, payments, orders, and audit.
- Redis: short-lived cache, rate-limit counters, and local fallback abstraction.
- OpenSearch: search and filtering projection for catalog discovery.
- Stripe sandbox: PaymentIntent-style payment lifecycle in local sandbox mode or real test-mode when sandbox credentials are supplied.

Additional architecture detail lives in [docs/architecture.md](docs/architecture.md), [docs/domain-model.md](docs/domain-model.md), [docs/api.md](docs/api.md), [docs/testing-strategy.md](docs/testing-strategy.md), and [docs/scaling-notes.md](docs/scaling-notes.md).

## Workspace structure

```text
apps/
  admin/
  api/
  storefront/
docs/
  api.md
  architecture.md
  domain-model.md
  product-decisions.md
  progress.md
  scaling-notes.md
  screenshots/
  testing-strategy.md
packages/
  config/
  contracts/
  domain/
  test-utils/
  ui/
tests/
  e2e/
.github/
  workflows/
```

## Local setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker Desktop or another Docker runtime able to run Compose

### Bootstrap

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy environment defaults where needed:
   - `.env.example`
   - `apps/api/.env.example`
   - `apps/storefront/.env.example`
   - `apps/admin/.env.example`

3. Start local infrastructure:

   ```bash
   pnpm infra:up
   ```

4. Apply database migrations:

   ```bash
   pnpm db:migrate
   ```

5. Seed deterministic demo data:

   ```bash
   pnpm db:seed
   ```

6. Start the workspace:

   ```bash
   pnpm dev
   ```

### Service-specific development

```bash
pnpm dev:storefront
pnpm dev:admin
pnpm dev:api
```

## Environment variables

Velora ships with root and app-level `.env.example` files. The key variables are:

### Shared and frontend

- `NODE_ENV`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STOREFRONT_URL`
- `NEXT_PUBLIC_ADMIN_URL`

### API and infrastructure

- `PORT`
- `API_PREFIX`
- `DATABASE_URL`
- `REDIS_URL`
- `CACHE_TTL_CATALOG_SECONDS`
- `CACHE_TTL_PRODUCT_SECONDS`
- `CACHE_TTL_SEARCH_SECONDS`
- `RATE_LIMIT_LOGIN_WINDOW_SECONDS`
- `RATE_LIMIT_LOGIN_MAX`
- `RATE_LIMIT_COUPON_WINDOW_SECONDS`
- `RATE_LIMIT_COUPON_MAX`
- `RATE_LIMIT_CHECKOUT_WINDOW_SECONDS`
- `RATE_LIMIT_CHECKOUT_MAX`
- `RATE_LIMIT_PAYMENT_ATTEMPT_WINDOW_SECONDS`
- `RATE_LIMIT_PAYMENT_ATTEMPT_MAX`
- `RATE_LIMIT_PAYMENT_CONFIRM_WINDOW_SECONDS`
- `RATE_LIMIT_PAYMENT_CONFIRM_MAX`
- `OPENSEARCH_URL`
- `OPENSEARCH_INITIAL_ADMIN_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

The default local stack uses:

- PostgreSQL on `localhost:5433`
- Redis on `localhost:6379`
- OpenSearch on `localhost:9200`
- API on `http://localhost:4000/api`
- Storefront on `http://localhost:3000`
- Admin on `http://localhost:3001`

## Infrastructure requirements

- PostgreSQL 16 for the transactional database
- Redis 7 for caching and rate limiting
- OpenSearch 2 for search indexing and filtering
- Docker Compose for local orchestration

## Commands

| Command               | Purpose                                                                              |
| --------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`            | Build shared packages and start the full workspace.                                  |
| `pnpm dev:storefront` | Run only the storefront app.                                                         |
| `pnpm dev:admin`      | Run only the admin app.                                                              |
| `pnpm dev:api`        | Run only the NestJS API.                                                             |
| `pnpm build`          | Run the full monorepo production build.                                              |
| `pnpm lint`           | Run lint checks across the workspace.                                                |
| `pnpm typecheck`      | Run strict TypeScript checks across the workspace.                                   |
| `pnpm test`           | Run workspace unit and integration tests.                                            |
| `pnpm test:e2e`       | Build shared packages and run Playwright browser flows against the mock API harness. |
| `pnpm perf:smoke`     | Run EXPLAIN-based hot-path query review against the API database.                    |
| `pnpm db:migrate`     | Apply committed Prisma migrations.                                                   |
| `pnpm db:seed`        | Seed deterministic demo data.                                                        |
| `pnpm infra:up`       | Start PostgreSQL, Redis, and OpenSearch.                                             |
| `pnpm infra:down`     | Stop and remove local infrastructure volumes.                                        |
| `pnpm format`         | Check formatting with Prettier.                                                      |

## Seed instructions

`pnpm db:seed` creates a coherent marketplace dataset that includes:

- multiple main categories and subcategories
- multiple sellers and brands
- rich products across several price bands
- low-stock items for reservation and concurrency coverage
- active, coupon-driven, and product-targeted promotions with platform-, seller-, and shared-funding examples
- sample customers and orders across different states
- search projection records and audit-friendly operational data

The seed path is rerunnable and is designed to support repeated local development resets.

## Demo accounts

- `admin@velora.local / Demo123!`
- `seller@velora.local / Demo123!`
- `customer@velora.local / Demo123!`

## Testing instructions

Primary verification:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Additional useful checks:

```bash
pnpm db:migrate
pnpm db:seed
pnpm perf:smoke
```

Notes:

- `pnpm test:e2e` uses a dedicated mock commerce API in `tests/e2e/mock-api/server.ts` so browser coverage can run in CI without depending on PostgreSQL, Redis, OpenSearch, or Stripe.
- `pnpm perf:smoke` requires PostgreSQL on `localhost:5433` with the latest migrations applied.

## Screenshots and placeholders

Reserved screenshot slots are tracked in [docs/screenshots/README.md](docs/screenshots/README.md). The intended captures are:

- storefront home and category discovery
- product detail and cart/checkout
- admin backoffice catalog and inventory management
- seller listings and stock management
- order confirmation and account order detail

## Future improvements

- Move reservation expiry, search sync, and webhook recovery onto dedicated worker processes with an outbox-driven event path.
- Replace placeholder media URLs with object storage and CDN-backed delivery.
- Add shipment creation, fulfillment milestones, and customer-visible tracking.
- Expand seller tooling into listing content editing, shipment handling, and seller-specific promotion visibility.
- Add notifications, fraud signals, tax/shipping integrations, and richer operational alerting.
