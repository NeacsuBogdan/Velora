# Testing Strategy

## Test pyramid

Velora uses a layered testing strategy instead of relying on one broad test type:

- unit and service tests for business rules and idempotency behavior
- integration-oriented API tests for cart, checkout, payments, promotions, admin, and seller logic
- browser end-to-end tests for user-critical journeys across the storefront, admin, and seller surfaces
- performance smoke review through EXPLAIN-driven query checks

## Unit and service coverage

The API test suite focuses on business-critical behavior rather than shallow controller snapshots. Important covered areas include:

- auth session behavior
- promotion and pricing rules
- cart repricing and coupon application
- checkout reservation creation
- stock reservation release behavior
- payment confirmation idempotency
- webhook replay handling
- seller access scoping
- admin operational safety checks
- rate limiting behavior
- search document mapping

## Deterministic fixtures and seeds

- Prisma seed data creates a coherent local marketplace dataset.
- Service tests use deterministic in-memory fixtures and mocked Prisma dependencies where direct database integration is not necessary.
- Browser tests reset a dedicated mock commerce API state before each scenario so each run starts from the same baseline.

## Browser E2E approach

Stage 11 adds Playwright coverage for flows that matter to user trust and operator confidence:

- customer category to product to cart to checkout to successful payment
- customer payment failure and retry
- admin inventory update visibility on the storefront
- admin promotion creation and customer coupon application
- seller inventory update visibility on the public product page

The browser suite runs against:

- a mock commerce API in `tests/e2e/mock-api/server.ts`
- the real storefront UI
- the real admin UI

This keeps the suite stable and CI-friendly while still exercising real browser behavior, route protection, forms, mutations, and page transitions.

## Concurrency testing approach

Concurrency risk is concentrated in stock reservation and settlement. The API coverage specifically tests last-unit scenarios where multiple attempts try to reserve the same stock at the same time. Assertions focus on:

- only the allowed number of reservations succeeding
- no negative or inconsistent inventory state
- reservation counts matching actual successful checkouts

The goal is not synthetic load generation. The goal is to prove the transactional guardrails prevent oversell under realistic contention.

## Webhook replay and idempotency approach

Payment providers retry webhooks, browsers retry, and users resubmit. Velora treats that as expected behavior.

Coverage focuses on:

- duplicate payment confirmation calls
- duplicate webhook deliveries
- replay-safe webhook processing with persisted external identifiers
- repeated reservation cleanup execution

Assertions check for single business effects rather than only checking HTTP status codes.

## Performance smoke testing approach

`pnpm perf:smoke` runs EXPLAIN-based query review against hot paths such as:

- catalog listing reads
- search reads
- cart retrieval
- order history retrieval
- reservation cleanup queries

This is intentionally a smoke layer, not a benchmark suite. It exists to catch obviously bad plan regressions and to document the query and index assumptions behind the current architecture.

## CI strategy

GitHub Actions runs:

- install
- lint
- typecheck
- tests
- build
- Playwright browser coverage

The browser job installs Chromium and publishes the Playwright HTML report on failure for debugging.
