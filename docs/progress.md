# Velora Progress

## Stage checklist

- [x] Stage 0 - Repo audit, bootstrap, workspace foundation
- [x] Stage 1 - API foundation, auth, core data model
- [x] Stage 2 - Storefront foundation
- [ ] Stage 3 - Catalog, category, product detail, search UX
- [ ] Stage 4 - Cart, inventory, stock reservation
- [ ] Stage 5 - Checkout, orders, payments
- [ ] Stage 6 - Promotions and pricing engine
- [ ] Stage 7 - Customer account and order history
- [ ] Stage 8 - Admin backoffice
- [ ] Stage 9 - Seller portal
- [ ] Stage 10 - Performance, cache, query, rate limiting pass
- [ ] Stage 11 - Test hardening, CI, docs, final polish

## Completed milestones

### Stage 0

- Audited the empty local folder and fetched the remote repository state.
- Confirmed `origin/main` as the default branch and created a working `dev` branch.
- Bootstrapped a pnpm workspace with the required apps and shared package boundaries.
- Added root scripts, TypeScript base configuration, ESLint, Prettier, and editor settings.
- Added Docker Compose services for PostgreSQL, Redis, and OpenSearch.
- Added initial environment examples, README, and repository documentation baseline.
- Verified `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test`.

### Stage 1

- Added a Prisma-backed PostgreSQL schema covering the initial commerce entities and enums.
- Added committed migrations plus Prisma 7 configuration and client generation hooks.
- Replaced placeholder database scripts with working `db:migrate`, `db:migrate:dev`, and `db:seed` commands.
- Added deterministic seed data for roles, demo accounts, seller, catalog, pricing, inventory, checkout, orders, promotions, search sync, and audit records.
- Implemented cookie-based session auth with persistent session records, role metadata, and protected route support.
- Added foundational Nest modules for users, catalog, inventory, cart, checkout, payments, orders, promotions, search sync, and audit.
- Added backend auth tests and verified a live login/session/orders smoke flow against the seeded database.
- Resolved local infrastructure port conflicts by moving Postgres to host port `5433` and removing unnecessary OpenSearch diagnostics port exposure.
- Verified `pnpm db:migrate`, `pnpm db:seed`, `pnpm --filter @velora/api test`, `pnpm --filter @velora/api build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

### Stage 2

- Connected the storefront to live Stage 1 API overview endpoints for catalog, promotions, cart, checkout, and orders.
- Added a client-side login flow built with React Hook Form and Zod that authenticates against the cookie-based API session.
- Added a protected account shell with middleware-based first-pass route protection and server-side session validation.
- Added category browsing, account overview, and account addresses shell pages with polished loading and error states.
- Added storefront auth and navigation tests for the login schema and account navigation model.
- Verified `pnpm --filter @velora/storefront lint`, `pnpm --filter @velora/storefront typecheck`, `pnpm --filter @velora/storefront test`, `pnpm --filter @velora/storefront build`, a standalone route smoke for `/`, `/categories`, `/login`, and protected `/account`, plus root `pnpm test` and `pnpm build`.

## Important implementation notes

- Internal packages are designed to build independently so the apps can consume stable outputs.
- Prisma 7 requires `prisma.config.ts` plus a PostgreSQL driver adapter at runtime; the API now uses the official `pg` adapter path consistently in app code and seeds.
- Storefront account protection now uses both Next middleware and server-side session validation, so missing cookies are redirected early and stale cookies still fail closed at render time.
- The workspace already includes the mandatory top-level scripts so later stages can evolve without changing the developer workflow contract.

## Known follow-up items

- Build the storefront auth screens, account shell, and initial API integration.
- Expand catalog browsing from Stage 1 overview endpoints into customer-facing listing and product detail flows.
- Build real search, filtering, and product detail endpoints and surfaces in Stage 3.
- Deepen test coverage from auth basics into integration, concurrency, and end-to-end coverage in later stages.
