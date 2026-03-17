# Velora Progress

## Stage checklist

- [x] Stage 0 - Repo audit, bootstrap, workspace foundation
- [x] Stage 1 - API foundation, auth, core data model
- [x] Stage 2 - Storefront foundation
- [x] Stage 3 - Catalog, category, product detail, search UX
- [x] Stage 4 - Cart, inventory, stock reservation
- [x] Stage 5 - Checkout, orders, payments
- [x] Stage 6 - Promotions and pricing engine
- [x] Stage 7 - Customer account and order history
- [x] Stage 8 - Admin backoffice
- [x] Stage 9 - Seller portal
- [x] Stage 10 - Performance, cache, query, rate limiting pass
- [x] Stage 11 - Test hardening, CI, docs, final polish

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

### Stage 6

- Replaced the placeholder promotions module with a real promotion service, controller, pricing snapshot helper, and deterministic rule engine that now evaluates percentage, fixed amount, cart threshold, category discount, and buy-x-get-y promotions.
- Expanded the shared contracts package with promotion management payloads, coupon application requests, discount summary shapes, and cart/checkout/order discount breakdowns so pricing data stays consistent across API and frontend apps.
- Added cart-level coupon support with customer endpoints to apply or remove coupon codes, persistent coupon state on the active cart, and automatic repricing on every cart mutation.
- Added checkout pricing snapshots so the payment settlement flow now freezes discount decisions at checkout time and persists applied discount snapshots into the created order.
- Extended order detail mapping so confirmation and later account/backoffice surfaces can show discount lineage alongside totals and refunds.
- Added richer promotion seed data for automatic phone discounts, cart-threshold savings, buy-x-get-y coverage, coupon-backed welcome pricing, and an exclusive VIP coupon path.
- Added storefront coupon controls plus cart, checkout, and confirmation UI sections that surface discount breakdowns instead of only net totals.
- Replaced the admin placeholder landing page with a session-aware promotion console that can sign in with the seeded admin account and create or update live promotion rules and optional coupons against the Stage 6 API.
- Added promotion-engine unit coverage plus pricing snapshot service coverage, then kept the existing cart, checkout, and payment tests green against the new discount-aware shapes.
- Verified `pnpm --filter @velora/api lint`, `pnpm --filter @velora/api typecheck`, `pnpm --filter @velora/api test`, `pnpm --filter @velora/storefront lint`, `pnpm --filter @velora/storefront typecheck`, `pnpm --filter @velora/admin lint`, `pnpm --filter @velora/admin typecheck`, plus root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Attempted `pnpm db:migrate` and `pnpm db:seed`, but local infrastructure verification was blocked because Docker Desktop and the Docker engine were not running during this session.

### Stage 7

- Replaced the account overview placeholder with a live customer workspace backed by dedicated `/users/me` and `/users/addresses` API contracts plus authenticated user endpoints.
- Added audited customer profile updates, address CRUD, default-address management, and default fallback logic in the Nest users module so shipping and billing destinations are now first-class account data.
- Added a real account order history route and per-order detail page that surface order status, payment state, discount snapshots, timeline entries, and refund records from the existing commerce engine.
- Added reusable storefront account form helpers, client-side profile and address forms built with React Hook Form and Zod, plus a shared status badge used across account and confirmation surfaces.
- Enriched the deterministic seed set with default customer shipping and billing addresses plus a richer bootstrap order timeline, and fixed the search projection seed path so reseeding stays idempotent.
- Verified the recovered local infrastructure path by running `pnpm db:migrate` and `pnpm db:seed`, then reran `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` successfully from the workspace root.

### Stage 8

- Added a dedicated admin module to the Nest API with admin-only endpoints for dashboard metrics, category CRUD, product CRUD, inventory adjustments, order management, customer lookup, seller management, and operational tooling.
- Expanded the shared contracts package with Stage 8 admin payloads so the backoffice, API, and future test coverage now share a stable management model rather than ad hoc response shapes.
- Extended the search projection services with targeted sync, removal, and full-index replacement flows so admin catalog, seller, and inventory changes keep the search projection recoverable and coherent.
- Rebuilt the admin app into a full backoffice workspace that now includes category management, product management, inventory management, order operations with refund actions, customer lookup, seller controls, operations tooling, and the existing promotion console.
- Added Stage 8 service coverage for category creation, inventory safety checks, guarded order-status transitions, and reindex execution, and refreshed the payment-attempt test fixture so the existing payment suite remains deterministic over time.
- Verified `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` successfully from the workspace root after the Stage 8 changes.

### Stage 9

- Added a dedicated seller module to the Nest API with seller-only endpoints for dashboard metrics, seller-scoped listings, inventory updates, order summaries, and order detail retrieval.
- Expanded the shared contracts package with Stage 9 seller dashboard, listing, inventory-update, and seller-order payloads so the API and storefront exchange a stable merchant-facing model.
- Implemented seller-scoped inventory mutation with reserved-stock safety checks, audit logging, inventory movements, and immediate search projection refresh after stock or lead-time changes.
- Tightened role separation by moving merchant workflows behind `/seller/*` endpoints and removing seller access from the generic customer orders surface.
- Built a protected seller portal inside the storefront app, including dedicated seller login, guarded seller routes, merchant overview, listing management with live inventory updates, and seller order history/detail views.
- Added Stage 9 service coverage for seller order scoping, inventory safety checks, and hidden out-of-scope order detail access.
- Verified `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` successfully from the workspace root after the Stage 9 changes.

### Stage 10

- Added a Redis-backed platform cache service with in-memory fallback plus a dedicated rate-limit module for sensitive commerce and authentication endpoints.
- Added route-level rate limiting for login, coupon application, checkout-session creation, payment-attempt creation, and payment confirmation flows.
- Cached public catalog overview, navigation, category detail, product detail, and search-query responses, and added cache invalidation hooks for admin and seller mutations that affect public read models.
- Reworked the search service to read from persisted `SearchDocument` projections instead of rebuilding relational listing projections on every query, while keeping OpenSearch fallback behavior intact.
- Added Stage 10 hot-path indexes for product-offer lookups, checkout reservation reads, customer order history, and seller-order joins, and added a `pnpm perf:smoke` script for EXPLAIN-based query review.
- Added Stage 10 rate-limit unit coverage and documented the cache/query strategy in `docs/scaling-notes.md`.
- Verified `pnpm --filter @velora/api lint`, `pnpm --filter @velora/api typecheck`, plus root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Attempted `pnpm db:migrate` and `pnpm perf:smoke`, but local infrastructure verification was blocked because PostgreSQL on `localhost:5433` and Docker Desktop were unavailable during this session.

### Stage 11

- Added replay- and recovery-focused API coverage for idempotent payment confirmation and reservation release cleanup so the critical commerce flows now have explicit regression protection.
- Added a Playwright browser suite covering customer browse-to-checkout success, failed payment retry, admin inventory mutation visibility, admin promotion creation and coupon application, and seller inventory visibility.
- Added a deterministic mock commerce API harness for browser coverage so end-to-end flows can run in CI without depending on local infrastructure services.
- Fixed a storefront product-detail freshness bug by forcing no-store reads for product detail data, which keeps inventory updates from admin and seller actions visible immediately.
- Hardened `pnpm test:e2e` so it builds shared workspace packages before launching the browser suite in a clean checkout.
- Added GitHub Actions CI with quality and browser jobs covering install, lint, typecheck, test, build, and Playwright execution.
- Rewrote the repository README and finalized the missing architecture, domain model, API, product-decision, testing-strategy, and screenshot placeholder documentation.
- Verified `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build` on the final Stage 11 state.
- Attempted `pnpm db:migrate` and `pnpm db:seed`, but local PostgreSQL on `localhost:5433` was unavailable because the Docker engine was not running during this session.

## Important implementation notes

- Internal packages are designed to build independently so the apps can consume stable outputs.
- Prisma 7 requires `prisma.config.ts` plus a PostgreSQL driver adapter at runtime; the API now uses the official `pg` adapter path consistently in app code and seeds.
- Storefront account protection now uses both Next middleware and server-side session validation, so missing cookies are redirected early and stale cookies still fail closed at render time.
- The workspace already includes the mandatory top-level scripts so later stages can evolve without changing the developer workflow contract.
- OpenSearch 2.19 requires an initial admin password in Docker Compose; the local stack now boots cleanly with `OPENSEARCH_INITIAL_ADMIN_PASSWORD` wired through the environment examples.
- Search remains projection-based: PostgreSQL stays the source of truth while OpenSearch is treated as a recoverable index that can fall back to in-process filtering during local development failures.
- App-level TypeScript path mappings are now scoped at the Nest API layer so local workspace typechecking can resolve shared-package source directly without breaking package-level builds.
- Stage 5 keeps checkout deterministic in local development: placeholder Stripe credentials activate a controlled sandbox path, while real `sk_test_` and `whsec_` values switch the same service over to live Stripe test-mode PaymentIntent and webhook verification behavior.
- Stage 6 now freezes pricing at checkout boundaries by storing a pricing snapshot on the checkout session, which prevents later admin promotion changes from mutating already-started payment flows.
- Stage 7 extends the customer account surface with dedicated user profile and address endpoints, so storefront account pages no longer depend on placeholder shell copy for personal data management.
- Storefront and admin typecheck scripts now run with `--incremental false`, which avoids stale Windows-specific TypeScript cache diagnostics during repeated verification passes.
- Search-document seeding now upserts by `listingId`, which keeps repeated `pnpm db:seed` executions safe after the richer Stage 3 search projection has already been populated locally.
- Stage 8 centralizes backoffice responsibilities behind a dedicated admin API surface, which keeps operator-only workflows out of the public and customer-facing modules while still reusing shared domain services.
- The API Vitest configuration now aliases workspace packages to source entries, which prevents stale built contract outputs from masking runtime test failures after shared-package changes.
- Stage 9 introduces a dedicated seller surface in both the API and storefront, which keeps merchant operations separate from customer account routes while still reusing the same session-cookie authentication model.
- Stage 10 shifts public catalog and search hot paths onto Redis-backed caching and persisted search projections, which reduces repeated relational work while keeping an in-memory fallback for local development when Redis is unavailable.
- Stage 11 uses a dedicated mock commerce API for Playwright coverage so browser tests stay deterministic and CI-friendly, while the real API remains covered by unit and integration tests.
- The storefront now renders explicit API-unavailable states for login, catalog, category, and product pages, which avoids raw fetch exceptions or misleading empty-result messaging when the backend is down locally.
- Storefront and admin typecheck now normalize `next-env.d.ts` before `tsc`, which prevents malformed `.next/dev` route references from breaking verification after local Next dev sessions.
- The API development runner now compiles with `tsc-watch` and restarts `dist/main.js`, which avoids the missing decorator-metadata crash that `tsx watch` caused in Nest during local development.
- The API dev script now checks whether the configured port is already occupied before starting, which prevents duplicate `pnpm dev:api` runs from failing with a raw `EADDRINUSE` stack trace.
- The storefront account overview now tolerates malformed `/users/me` payloads by validating the profile shape and falling back to safe derived metrics, which prevents `/account` from crashing if the API returns only session-like user data.
- Category detail pages now bypass stale fetch caching and can fall back to search-projection metadata when only the category-detail endpoint misses, which prevents valid category listings from degrading into a dead-end not-found panel.
- Storefront login now completes through a same-origin auth proxy and then performs a full-page redirect, which makes the session cookie visible to subsequent account and cart requests immediately instead of depending on a fragile cross-port client navigation race.
- The public storefront header now resolves the active session server-side and only shows seller navigation for seller accounts, which keeps customer sessions from seeing stale `Login` links or merchant-only entry points.
- The API build now clears stale output and runs `dist/apps/api/src/main.js`, which fixes a broken compile-output mismatch that had left newer modules like cart, seller, and admin unavailable at runtime even though their source code existed.
- Storefront cart quantity and checkout trigger buttons now clear their local pending state after successful mutations and on fetch failures, which prevents the controls from getting stuck disabled after the first interaction.
- Storefront and admin login now both finalize through same-origin auth proxies, and the generic storefront login now redirects admin and seller accounts into their dedicated workspaces by default instead of dropping every role into the customer account shell.
- The storefront header and account shell now expose explicit admin and seller workspace links based on the active session roles, which makes catalog, refund, and merchant tooling reachable without guessing the correct app entrypoint.
- Sellers can now update their own offer pricing, compare-at pricing, and storefront visibility from the seller listings page, while platform-wide promotions remain centralized in the admin pricing console.
- The seller listings workspace now includes a dedicated create-offer flow plus archive actions, which lets merchants add or retire their own offers without needing the admin backoffice for routine catalog operations.
- The seller listings editor now uses stacked commercial and inventory panels instead of one cramped horizontal row, which makes the pricing and stock controls readable on typical laptop widths.
- The admin workspace header now includes an explicit marketplace return link, which removes the need to bounce back to the storefront by manually editing the URL.
- Admin selector panes such as inventory, categories, products, orders, sellers, and promotions now cap their own height and scroll internally, which keeps long management lists from stretching the whole backoffice page.
- The seller commercial editor now keeps its operational note above the action buttons and collapses into a single-column field stack sooner, which fixes the cramped footer spacing on mid-width layouts.
- The seller listing editors now keep both commercial and stock fields in a single column, which removes the remaining `Offer visibility` and `Pricing note` compression on narrower seller workspace widths.
- The admin split panels now keep the left control pane sticky on larger screens, while selector lists and admin tables scroll inside capped containers, which keeps filters visible even when catalog and order volumes grow.

## Known follow-up items

- Extend Stage 5 refund handling into richer administrative flows and customer-facing refund visibility in later account and backoffice stages.
- Expand Stage 8 order-management tooling with shipment creation, carrier metadata, and manual exception workflows once fulfillment basics are added.
- Add richer customer-visible shipment and return-request details once the fulfillment and seller workflow stages are in place.
- Extend the seller portal with listing content edits, seller-facing promotion visibility, and shipment handling once fulfillment and performance stages are completed.
- Run the new Stage 10 migration and `pnpm perf:smoke` once local infrastructure is available again so the EXPLAIN output can be captured alongside the committed query-review notes.
