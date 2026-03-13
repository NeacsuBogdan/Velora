# Architecture

## Monorepo overview

Velora is organized as a pnpm workspace with three deployable apps and a small set of shared packages:

- `apps/storefront`: customer-facing Next.js App Router application for browsing, cart, checkout, account, and seller access entry points.
- `apps/admin`: Next.js App Router backoffice for catalog, promotions, inventory, orders, customers, sellers, and operations.
- `apps/api`: NestJS commerce API responsible for authentication, catalog, search, cart, checkout, payments, orders, promotions, seller scope, admin scope, and audit.
- `packages/contracts`: shared Zod schemas and generated TypeScript types for API boundaries.
- `packages/domain`: shared enums and domain-level constants.
- `packages/ui`: shared frontend building blocks.
- `packages/config`: environment and configuration helpers.
- `packages/test-utils`: deterministic fixtures and helpers reused in tests.

## App and package responsibilities

### Storefront

- Server Components for public catalog pages and account surfaces.
- Client Components where mutations matter: login, cart actions, checkout actions, profile/address forms, seller inventory updates.
- Reads public data from the API with short-lived caching for listing/search flows and no-store fetches for sensitive account and checkout paths.

### Admin

- Session-aware operator UI.
- Calls admin-only API routes for category/product CRUD, inventory adjustments, order operations, customer lookup, seller management, promotion management, and recovery tooling.

### API

- Stateless NestJS application.
- Cookie-based session auth with role guards for customer, seller, and admin access separation.
- PostgreSQL-backed transactional flows for checkout, payments, inventory, and orders.
- Redis-backed platform cache and rate limiting with in-memory fallback for local development.
- Search projection writes to OpenSearch while keeping a persisted `SearchDocument` fallback in PostgreSQL.

## Request flows

### Catalog browse and search

1. Storefront requests catalog navigation, category detail, product detail, or search results from the API.
2. The API first checks short-lived cache for public reads.
3. Category and product detail hydrate from PostgreSQL catalog data.
4. Search reads from OpenSearch where available; when unavailable, it can fall back to persisted projection data and in-process filtering.
5. Admin or seller catalog mutations invalidate public cache keys and refresh the related search projection.

### Cart, reservation, and checkout

1. An authenticated customer adds a listing to the active cart.
2. Cart repricing happens on the server after each mutation and re-evaluates promotions.
3. Checkout creation starts a transaction, validates availability, and creates stock reservations with an expiration timestamp.
4. The checkout session stores a pricing snapshot so later promotion changes do not mutate an in-flight payment.
5. Successful payment settlement consumes reservations, mutates inventory, converts the cart, and creates the order.

### Admin and seller mutation path

1. Admin or seller UI submits a scoped mutation to the API.
2. Role guards validate access.
3. The API updates PostgreSQL inside domain-specific services.
4. Audit records are written for critical actions.
5. Search projection refresh and public cache invalidation run immediately so public surfaces reflect the new state quickly.

## Auth architecture

- Authentication is cookie-based and uses the `velora_session` cookie.
- Session tokens are stored hashed in PostgreSQL, with expiration and status tracking.
- `SessionAuthGuard` validates the session and attaches the authenticated user context.
- `RolesGuard` enforces route-level access for `CUSTOMER`, `SELLER`, and `ADMIN`.
- Frontend route protection happens in two layers:
  - navigation redirects for obviously unauthenticated routes
  - server-side session fetches that fail closed for stale or revoked cookies

This keeps auth state consistent across the storefront, admin, and seller surfaces without pushing sensitive state management into the browser.

## Search architecture

- PostgreSQL remains the source of truth for products, listings, prices, and inventory.
- Search is a projection, not the source of truth.
- Each sellable listing can have a persisted `SearchDocument` record plus an OpenSearch document.
- Search sync writes are triggered by seed, admin mutations, seller inventory updates, and reindex operations.
- `SearchSyncLog` and `ReindexJob` make indexing failures visible and recoverable.
- Admin operations expose reindex controls so the projection can be rebuilt after data or infrastructure issues.

## Payment architecture

- Checkout sessions represent the reservation window and frozen price context.
- `PaymentAttempt` models an idempotent attempt against the checkout session.
- `PaymentEvent` stores provider event payloads and status transitions.
- `WebhookDeliveryRecord` stores raw webhook identity and processing status to make replay handling safe.
- `RefundRecord` stores refund intent and resulting payment-status changes.

The sandbox path supports deterministic success, decline, and retry flows. When real Stripe sandbox credentials are supplied, the same service switches to PaymentIntent and signature verification behavior.

## Async processing architecture

Velora models async and recoverable work explicitly, but the MVP keeps execution inside the API process rather than introducing a separate worker fleet too early.

Current persisted async or recovery primitives:

- `WebhookDeliveryRecord` for replay-safe webhook handling
- `SearchSyncLog` for projection sync visibility
- `ReindexJob` for full reindex execution status
- `JobRun` for operational job tracking
- reservation cleanup and reindex endpoints in the admin surface

This keeps the design ready for a later move to queue-backed workers without forcing distributed-systems complexity into the MVP. The next scaling step is to move webhook retries, reservation expiry sweeps, and indexing work onto dedicated workers with an outbox or event-delivery path.
