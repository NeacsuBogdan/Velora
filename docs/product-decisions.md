# Product Decisions

## Why this stack

### pnpm workspace monorepo

Velora shares contracts, domain enums, UI primitives, and test utilities across three apps. A monorepo keeps those boundaries explicit while avoiding version drift between frontend and API packages.

### Next.js App Router for storefront and admin

The storefront needs strong server-rendering support for catalog pages, while the admin and seller surfaces need productive client-side mutation workflows. App Router supports both patterns cleanly and keeps auth-aware server fetches straightforward.

### NestJS for the API

NestJS provides a modular structure that fits a commerce domain with many bounded areas: auth, cart, checkout, payments, promotions, admin, seller, and audit. Guards and decorators keep role-aware access control readable instead of scattering authorization checks across handlers.

### PostgreSQL, Redis, and OpenSearch

- PostgreSQL is the transactional source of truth.
- Redis handles short-lived state concerns such as cache and rate limiting.
- OpenSearch handles search and filtering without forcing the transactional database to carry discovery workloads.

This split mirrors how a marketplace grows in practice: operations and checkout stay transactional, while discovery becomes projection- and cache-driven.

## Why search is separate

Catalog discovery and transactional correctness have different needs. Product filtering, faceting, and keyword ranking work better as a projection than as repeated relational queries over the order and inventory source of truth.

Velora keeps PostgreSQL authoritative, but stores searchable listing projections in both persisted `SearchDocument` rows and OpenSearch. That gives the system:

- a recoverable index
- targeted sync after catalog mutations
- operator-visible reindex controls
- clean separation between search performance concerns and checkout correctness

## Why stock reservation is modeled this way

The platform reserves stock at checkout-session creation instead of decrementing inventory only after payment. This reduces oversell risk and gives the customer a bounded payment window.

The reservation model also makes failure handling explicit:

- payment failure keeps the reservation alive until expiry or manual retry
- abandoned checkout can expire cleanly
- successful settlement consumes the reservation
- repeated cleanup can safely release already-processed reservations

This is a better fit for marketplace checkout than relying on optimistic UI assumptions or naive last-second stock checks.

## Why payment and webhook handling are idempotent

Payment providers retry webhooks, browsers resubmit requests, and users retry payment actions after ambiguous failures. Velora treats duplicate delivery as normal behavior, not an edge case.

The design uses:

- idempotency keys on checkout session and payment-attempt creation
- persisted `PaymentAttempt` records
- raw external event identifiers in `PaymentEvent` and `WebhookDeliveryRecord`
- replay-safe settlement and refund paths

Without this, duplicate events could create duplicate orders, double-consume stock, or corrupt payment state.

## Why seller onboarding is approval-based instead of public seller signup

Customers can self-register immediately because their access is low-risk and bounded to customer workflows. Sellers are different: they affect catalog quality, marketplace trust, inventory correctness, and operational support load.

Velora therefore uses a two-step merchant onboarding flow:

- a public application form
- admin review and approval
- a one-time activation link for the seller owner account

This keeps the marketplace closer to how real operator-led platforms behave. It also avoids a common anti-pattern where seller access is granted before legal, commercial, or catalog checks happen.

The current MVP deliberately stops short of full contract and email automation. Admins review the application and can hand off the activation link directly in local development, while the data model is already shaped to evolve toward invite emails and richer onboarding states later.

## Why notifications are persisted in-app instead of only shown as UI banners

Marketplace workflows span multiple surfaces and time windows. A seller may sign in hours after an order is paid, and an admin may review seller onboarding later than the original submission moment. Temporary UI banners are not enough for that.

Velora stores notifications as durable records tied to a user, with unread state and deep links back into the relevant workspace. That keeps cross-role communication practical without pretending the MVP already has email, SMS, or push delivery infrastructure.

## Why browser E2E uses a mock API harness

The Stage 11 browser suite is meant to guard user-facing flows in CI, not to duplicate all real API integration coverage. The mock API harness keeps those tests:

- deterministic
- fast enough to run on every CI pass
- independent from Docker, PostgreSQL, Redis, OpenSearch, and Stripe availability

Real API behavior is still covered by service tests, integration-oriented domain tests, and the seeded local stack.

## Intentionally out of scope in the current MVP

- multi-warehouse inventory allocation
- carrier integrations and fulfillment orchestration
- tax engine integration
- notification pipelines
- cloud object storage and media processing
- advanced fraud tooling
- event bus or worker fleet split into separate deployable services

Those are valid next steps, but they were intentionally deferred to keep the MVP serious and reviewable instead of bloated.
