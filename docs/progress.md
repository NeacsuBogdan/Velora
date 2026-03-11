# Velora Progress

## Stage checklist

- [x] Stage 0 - Repo audit, bootstrap, workspace foundation
- [x] Stage 1 - API foundation, auth, core data model
- [x] Stage 2 - Storefront foundation
- [x] Stage 3 - Catalog, category, product detail, search UX
- [x] Stage 4 - Cart, inventory, stock reservation
- [x] Stage 5 - Checkout, orders, payments
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

### Stage 3

- Expanded the shared contracts package with catalog listing, faceting, breadcrumb, and product detail schemas so the API and storefront now exchange a stable search and merchandising model.
- Refactored the catalog module into dedicated controller and service layers with live endpoints for catalog navigation, category detail, and rich product detail pages.
- Added a search module with OpenSearch-backed querying, deterministic fallback filtering, document projection helpers, and first-use synchronization from the transactional catalog data.
- Extended the seed data with additional sellers, brands, categories, active listings, and search projection records so browsing and search now feel realistic rather than skeletal.
- Built production-style storefront flows for category browsing, product listing, product detail, and full-text search, including filtering, sorting, breadcrumbs, and product cards.
- Tightened storefront media handling by switching to `next/image` and explicitly allowing seeded placeholder hosts in the Next.js image configuration.
- Added search projection unit tests plus storefront query helper tests, then verified `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` from the workspace root.

### Stage 4

- Replaced the placeholder cart, inventory, and checkout overview modules with real service and controller layers for authenticated customer cart access and checkout-session reservation creation.
- Added a shared Stage 4 contract surface for cart detail payloads, cart mutations, checkout-session reservation responses, and reservation-release summaries.
- Implemented cart item add, update, and remove flows with automatic cart repricing, active-checkout invalidation on mutation, and live availability checks against catalog listings.
- Implemented atomic inventory reservation updates using a guarded PostgreSQL update path so concurrent checkout starts cannot oversell the same inventory row.
- Added reservation expiration and release handling, inventory movement records, and audit log entries for reservation creation, expiration, release, and checkout invalidation paths.
- Added a protected storefront cart page, live add-to-cart controls on product detail offers, and a customer-facing stock reservation trigger that starts checkout without yet entering the Stage 5 payment flow.
- Added API tests for cart mutation, checkout-session reservation creation, reservation expiration handling, and the last-unit concurrency scenario.
- Verified `pnpm --filter @velora/api lint`, `pnpm --filter @velora/api typecheck`, `pnpm --filter @velora/api test`, plus root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

### Stage 5

- Replaced the placeholder payments and orders overview modules with real controller, service, and mapping layers for payment attempts, webhook handling, order listing, and order detail retrieval.
- Expanded the shared contracts package with checkout-session detail, payment-attempt, order-summary, order-detail, refund, and webhook acknowledgement schemas so the API and storefront now share a concrete checkout-to-order payload model.
- Added PaymentIntent-style attempt creation and confirmation flows that work in both deterministic local sandbox mode and real Stripe test mode when sandbox keys are provided.
- Added replay-safe webhook processing with persisted delivery records, raw payload support in Nest, duplicate event suppression, payment event storage, and idempotent order settlement.
- Added successful-payment settlement logic that consumes reservations, decrements inventory, creates inventory movements, converts the cart, and creates a paid order plus status history.
- Added refund creation basics with persisted refund records, payment status updates, order status synchronization, and audit logging.
- Added a real storefront checkout page, sandbox payment controls, checkout-session retrieval, and order confirmation route so the customer journey now extends from cart reservation into payment and a finalized order screen.
- Added Stage 5 API tests for payment-attempt idempotency, successful settlement into an order, and duplicate webhook replay handling.
- Verified `pnpm --filter @velora/api lint`, `pnpm --filter @velora/api typecheck`, `pnpm --filter @velora/api test`, `pnpm --filter @velora/storefront lint`, `pnpm --filter @velora/storefront typecheck`, plus root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Important implementation notes

- Internal packages are designed to build independently so the apps can consume stable outputs.
- Prisma 7 requires `prisma.config.ts` plus a PostgreSQL driver adapter at runtime; the API now uses the official `pg` adapter path consistently in app code and seeds.
- Storefront account protection now uses both Next middleware and server-side session validation, so missing cookies are redirected early and stale cookies still fail closed at render time.
- The workspace already includes the mandatory top-level scripts so later stages can evolve without changing the developer workflow contract.
- OpenSearch 2.19 requires an initial admin password in Docker Compose; the local stack now boots cleanly with `OPENSEARCH_INITIAL_ADMIN_PASSWORD` wired through the environment examples.
- Search remains projection-based: PostgreSQL stays the source of truth while OpenSearch is treated as a recoverable index that can fall back to in-process filtering during local development failures.
- App-level TypeScript path mappings are now scoped at the Nest API layer so local workspace typechecking can resolve shared-package source directly without breaking package-level builds.
- Stage 5 keeps checkout deterministic in local development: placeholder Stripe credentials activate a controlled sandbox path, while real `sk_test_` and `whsec_` values switch the same service over to live Stripe test-mode PaymentIntent and webhook verification behavior.

## Known follow-up items

- Implement the Stage 6 promotion engine so cart and order pricing no longer remain purely list-price based across checkout settlement.
- Extend Stage 5 refund handling into richer administrative flows and customer-facing refund visibility in later account and backoffice stages.
- Add end-to-end browser coverage for the checkout success, failure, and retry paths once the admin and seller flows are also in place.
- Surface payment and order timelines more deeply inside the customer account area during Stage 7.
