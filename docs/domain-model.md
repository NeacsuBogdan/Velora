# Domain Model

## Core entities

### Identity and access

- `User`: application identity for customers, admins, and seller owners.
- `Role` and `UserRoleAssignment`: role catalog and many-to-many assignment model.
- `Session`: persistent session record with hashed token, expiry, status, IP, and user agent.
- `Address`: customer shipping and billing addresses with default markers.
- `Seller`: merchant profile optionally owned by a user account.

### Catalog

- `Brand`
- `Category`
- `Product`
- `ProductVariant`
- `ProductMedia`
- `ProductAttribute`
- `ProductSpecification`
- `SellerProductListing`: the sellable marketplace offer owned by a seller
- `Price`: time-aware listing price records

### Pricing and promotions

- `Promotion`
- `PromotionRule`
- `Coupon`
- `AppliedDiscountSnapshot`

### Inventory

- `InventoryItem`: per-listing stock ledger with `onHand`, `reserved`, and `safetyStock`.
- `StockReservation`: temporary hold created during checkout.
- `InventoryMovement`: auditable delta log for adjustments, reservation, release, and consumption.

### Cart and checkout

- `Cart`
- `CartItem`
- `CheckoutSession`

### Payments

- `PaymentAttempt`
- `PaymentEvent`
- `RefundRecord`

### Orders and fulfillment placeholders

- `Order`
- `OrderItem`
- `OrderStatusHistory`
- `Shipment`
- `ReturnRequest`

### Search and operations

- `SearchDocument`
- `ReindexJob`
- `SearchSyncLog`
- `AuditLog`
- `JobRun`
- `WebhookDeliveryRecord`

## Relationship highlights

- A `User` can hold multiple roles and multiple sessions.
- A `Seller` owns many `SellerProductListing` records.
- A `Product` can have multiple variants, media entries, attributes, specifications, and listings.
- A `SellerProductListing` has one inventory row, many prices, and optional search projection state.
- A `Cart` belongs to one user and can later spawn checkout sessions over its lifetime, though only one active checkout is kept valid after cart mutation.
- A `CheckoutSession` owns the active reservation set and can settle into exactly one `Order`.
- An `Order` references the payment attempt that settled it and stores immutable discount snapshots.

## State transitions

### Session

- `ACTIVE -> REVOKED`
- `ACTIVE -> EXPIRED`

### Product

- `DRAFT -> ACTIVE -> ARCHIVED`

### Cart

- `ACTIVE -> CONVERTED`
- `ACTIVE -> ABANDONED`

### Stock reservation

- `ACTIVE -> CONSUMED`
- `ACTIVE -> RELEASED`
- `ACTIVE -> EXPIRED`

### Checkout session

- `STARTED -> PAYMENT_PENDING`
- `PAYMENT_PENDING -> COMPLETED`
- `PAYMENT_PENDING -> FAILED`
- `STARTED or PAYMENT_PENDING -> EXPIRED`

### Payment

- `PENDING -> REQUIRES_ACTION`
- `PENDING or REQUIRES_ACTION -> SUCCEEDED`
- `PENDING or REQUIRES_ACTION -> FAILED`
- `SUCCEEDED -> PARTIALLY_REFUNDED`
- `SUCCEEDED or PARTIALLY_REFUNDED -> REFUNDED`

### Order

- `CREATED -> PAYMENT_PENDING`
- `PAYMENT_PENDING -> PAID`
- `PAID -> PROCESSING`
- `PROCESSING -> SHIPPED`
- `SHIPPED -> COMPLETED`
- `PAID or PROCESSING -> REFUNDED`
- `CREATED or PAYMENT_PENDING -> CANCELED`

## Critical business invariants

- Stock cannot be oversold. Reservation creation only succeeds when `onHand - reserved - safetyStock` covers the requested quantity.
- Reservation release is idempotent. Cleanup jobs can run repeatedly without creating duplicate releases.
- Payment confirmation is idempotent. Repeating a successful confirmation must not create a second order or consume stock twice.
- Webhook processing is replay-safe. Duplicate external event identifiers are persisted and ignored after the first successful effect.
- Cart, checkout, and order totals are server-authored. Client-submitted totals are never trusted.
- Promotions are deterministic. Exclusive promotions block stackable combinations when selected by the pricing engine.
- Order discount data is immutable after order creation because discount snapshots are persisted at settlement time.
- Seller access is scoped. Sellers can view and mutate only their own listings, inventory, and seller-order slices.
- Search remains recoverable. OpenSearch failure does not invalidate the transactional catalog; reindex and persisted projections can rebuild the search layer.
