# Scaling Notes

## Current architecture

Velora currently runs as a pnpm monorepo with a stateless NestJS API, Next.js storefront/admin apps, PostgreSQL as the transactional source of truth, Redis for cache and rate limiting, and OpenSearch as the catalog search projection.

The search path now reads from persisted `SearchDocument` projections instead of rebuilding the full listing projection from relational joins on every request. Public catalog reads are short-lived cached responses, while authenticated cart, checkout, and order reads remain uncached because they are mutation-heavy and identity-scoped.

## Cache strategy

- `catalog:*` keys cache public catalog overview, navigation, category detail, and product detail responses.
- `search:projection:*` caches persisted projection documents loaded from PostgreSQL.
- `search:query:*` caches normalized search responses across OpenSearch and fallback execution.
- Cache writes prefer Redis and fall back to in-memory storage if Redis is unavailable locally.
- Admin and seller mutations invalidate public read caches so price, availability, and category changes do not sit behind long-lived stale responses.

## Rate limiting

Sensitive routes now enforce short-window limits with Redis-backed counters and in-memory fallback:

- `POST /auth/login`
- `POST /cart/coupon`
- `POST /checkout/sessions`
- `POST /payments/checkout-sessions/:checkoutSessionId/attempts`
- `POST /payments/attempts/:attemptId/confirm`

The limiter keys on client IP for login and on authenticated user id with IP fallback for protected commerce actions.

## Hot-path query review

Stage 10 adds or relies on the following index strategy for hot flows:

- `SellerProductListing(productId, isActive, status)` for product detail offer lookups.
- `Cart(userId, status)` for active cart retrieval.
- `StockReservation(checkoutSessionId, status)` for reservation release and settlement paths.
- `Order(userId, createdAt)` for customer order history sorted by recency.
- `OrderItem(listingId, orderId)` for seller-scoped order joins.

Run `pnpm perf:smoke` after infrastructure is up to print the current `EXPLAIN` plans for these review queries.

## Bottleneck candidates

- Checkout and payment settlement remain the highest write-contention paths because they combine reservation consumption, inventory mutation, payment state, and order state transitions in one flow.
- Search warm-up still depends on the persisted projection cache being populated; a cold process start without Redis will hit PostgreSQL for the initial projection load.
- Seller-scoped order views still require relational joins through order items because mixed-seller marketplace orders are not yet materialized into dedicated seller-order projections.
- Media delivery is still placeholder/local-URL driven and should move behind object storage plus CDN before meaningful traffic.

## Path to larger scale

For the next order of magnitude, the platform should evolve along these lines:

- Move background reindex, reservation expiry cleanup, and webhook recovery onto dedicated worker processes.
- Add read replicas for catalog and order-history reads, while keeping checkout and payment writes on the primary.
- Introduce cache stampede protection and selective prewarming for catalog navigation, top categories, and highest-traffic search terms.
- Materialize seller-order projections and operational dashboards into dedicated tables or stream-driven read models.
- Put media and public product pages behind CDN caching with explicit invalidation hooks.
- Split the search projection updater, payments/webhook processor, and catalog management surfaces into independently deployable services if traffic and team size justify the extra operational cost.

## Hundreds of thousands of concurrent users

Reaching that scale would require more than the current single-region local-first setup:

- multi-node Redis with persistence and failover
- PostgreSQL partitioning, read replicas, and aggressive connection-pool discipline
- isolated worker fleets for checkout, payment, indexing, and notification workloads
- queue-backed outbox/event delivery instead of direct mutation-triggered sync calls
- multi-node OpenSearch with dedicated ingest and query capacity
- CDN-backed media and edge caching for anonymous catalog traffic
- stronger observability around p95/p99 latency, cache hit ratio, queue lag, and lock contention
