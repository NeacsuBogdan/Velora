# API

## Base URL

Local development defaults to:

```text
http://localhost:4000/api
```

Authentication uses the `velora_session` HTTP-only cookie.

## Auth rules

- Public routes: health, catalog, search, login, logout, customer register, seller application, seller activation preview, seller activation completion.
- Authenticated inbox routes: notifications feed, mark-read, mark-all-read.
- Customer routes: session, profile, addresses, cart, checkout, payments, orders.
- Seller routes: seller dashboard, seller catalog options, listing create/update/archive, inventory update, seller orders.
- Admin routes: admin dashboard and management routes, promotions, refunds, audit overview, reindex, reservation cleanup, and seller application review.

Access control is enforced by `SessionAuthGuard` and `RolesGuard`.

## Endpoint summary

### Public

- `GET /health`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/register`
- `GET /catalog/overview`
- `GET /catalog/navigation`
- `GET /catalog/categories/:slug`
- `GET /catalog/products/:slug`
- `GET /search/products`
- `POST /seller-onboarding/applications`
- `GET /seller-onboarding/activation/:token`
- `POST /seller-onboarding/activation/:token`

### Customer

- `GET /auth/session`
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/addresses`
- `POST /users/addresses`
- `PATCH /users/addresses/:addressId`
- `DELETE /users/addresses/:addressId`
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:itemId`
- `DELETE /cart/items/:itemId`
- `POST /cart/coupon`
- `DELETE /cart/coupon`
- `POST /checkout/sessions`
- `GET /checkout/sessions/:checkoutSessionId`
- `POST /payments/checkout-sessions/:checkoutSessionId/attempts`
- `POST /payments/attempts/:attemptId/confirm`
- `GET /orders`
- `GET /orders/:number`

### Authenticated inbox

- `GET /notifications`
- `PATCH /notifications/:notificationId/read`
- `POST /notifications/read-all`

### Seller

- `GET /seller/dashboard`
- `GET /seller/listings`
- `GET /seller/catalog-options`
- `POST /seller/listings`
- `PATCH /seller/listings/:listingId`
- `DELETE /seller/listings/:listingId`
- `PATCH /seller/inventory/:inventoryItemId`
- `GET /seller/orders`
- `GET /seller/orders/:number`

### Admin and operator

- `GET /admin/dashboard`
- `GET /admin/catalog-options`
- `GET /admin/categories`
- `POST /admin/categories`
- `PATCH /admin/categories/:categoryId`
- `DELETE /admin/categories/:categoryId`
- `GET /admin/products`
- `POST /admin/products`
- `PATCH /admin/products/:productId`
- `DELETE /admin/products/:productId`
- `GET /admin/inventory`
- `PATCH /admin/inventory/:inventoryItemId`
- `GET /admin/orders`
- `GET /admin/orders/:number`
- `PATCH /admin/orders/:number/status`
- `GET /admin/customers`
- `GET /admin/seller-applications`
- `PATCH /admin/seller-applications/:applicationId/review`
- `GET /admin/sellers`
- `PATCH /admin/sellers/:sellerId`
- `GET /admin/operations`
- `POST /admin/operations/reindex`
- `POST /admin/operations/release-expired-reservations`
- `GET /promotions/overview`
- `GET /promotions`
- `POST /promotions`
- `PATCH /promotions/:promotionId`
- `POST /payments/orders/:orderId/refunds`
- `GET /audit/overview`

## Request and response examples

### Login

Request:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "customer@velora.local",
  "password": "Demo123!"
}
```

Response:

```json
{
  "sessionId": "cm8session123",
  "expiresAt": "2026-03-20T10:00:00.000Z",
  "user": {
    "id": "cm8user123",
    "email": "customer@velora.local",
    "firstName": "Daria",
    "lastName": "Ionescu",
    "roles": [
      {
        "code": "CUSTOMER",
        "name": "Customer"
      }
    ]
  }
}
```

The response also sets the `velora_session` cookie.

### Search products

Request:

```http
GET /api/search/products?q=nordwave&category=phones&sort=price_asc
```

Response shape:

```json
{
  "source": "opensearch",
  "query": "nordwave",
  "availableSorts": [
    { "value": "relevance", "label": "Relevance" },
    { "value": "price_asc", "label": "Price: low to high" }
  ],
  "appliedFilters": {
    "query": "nordwave",
    "category": "phones",
    "brands": [],
    "minPrice": null,
    "maxPrice": null,
    "availability": "all",
    "sort": "price_asc"
  },
  "pagination": {
    "page": 1,
    "pageSize": 24,
    "totalItems": 1,
    "totalPages": 1
  },
  "items": [],
  "facets": {
    "brands": [],
    "categories": [],
    "availability": [],
    "priceRange": {
      "min": 219900,
      "max": 219900
    }
  }
}
```

### Submit seller application

Request:

```http
POST /api/seller-onboarding/applications
Content-Type: application/json

{
  "displayName": "North Star Gadgets",
  "legalName": "North Star Gadgets SRL",
  "contactFirstName": "Mihai",
  "contactLastName": "Popescu",
  "contactEmail": "partners@northstar.example",
  "contactPhone": "+40 721 000 111",
  "websiteUrl": "https://northstar.example",
  "catalogSummary": "Consumer electronics, accessories, and small devices already stocked locally.",
  "notes": "Can onboard with same-week catalog imports."
}
```

Response:

```json
{
  "applicationId": "seed-seller-application-pending",
  "status": "SUBMITTED",
  "submittedAt": "2026-03-17T18:30:00.000Z",
  "message": "Application received. The marketplace team can now review and approve your merchant onboarding."
}
```

### Review seller application

Request:

```http
PATCH /api/admin/seller-applications/seed-seller-application-pending/review
Content-Type: application/json
Cookie: velora_session=...

{
  "decision": "APPROVE",
  "note": "Commercial review completed. Activation can be issued."
}
```

Response shape:

```json
{
  "application": {
    "applicationId": "seed-seller-application-pending",
    "status": "ACTIVATION_PENDING",
    "displayName": "North Star Gadgets",
    "contactEmail": "partners@northstar.example"
  },
  "activationLink": "http://localhost:3000/seller/activate?token=..."
}
```

### Activate seller account

Request:

```http
POST /api/seller-onboarding/activation/<token>
Content-Type: application/json

{
  "firstName": "Mihai",
  "lastName": "Popescu",
  "password": "Demo123!"
}
```

### List notifications

Request:

```http
GET /api/notifications?limit=8
Cookie: velora_session=...
```

Response shape:

```json
{
  "unreadCount": 2,
  "items": [
    {
      "notificationId": "cm8notification123",
      "title": "Order placed successfully",
      "message": "Order VLR-20260317-ABCD1234 has been paid and is now ready for fulfilment tracking.",
      "kind": "ORDER",
      "level": "SUCCESS",
      "linkUrl": "/account/orders/VLR-20260317-ABCD1234",
      "isRead": false,
      "createdAt": "2026-03-17T18:45:00.000Z",
      "readAt": null
    }
  ]
}
```

Response shape:

```json
{
  "sellerSlug": "north-star-gadgets",
  "session": {
    "sessionId": "cm8session456",
    "expiresAt": "2026-03-20T10:00:00.000Z",
    "user": {
      "email": "partners@northstar.example",
      "roles": [
        {
          "code": "SELLER",
          "name": "Seller"
        }
      ]
    }
  }
}
```

### Create checkout session

Request:

```http
POST /api/checkout/sessions
Content-Type: application/json
Cookie: velora_session=...

{
  "idempotencyKey": "checkout-customer-001"
}
```

Response:

```json
{
  "checkoutSessionId": "cm8checkout123",
  "cartId": "cm8cart123",
  "status": "STARTED",
  "amount": {
    "amount": 219900,
    "currency": "RON"
  },
  "reservationExpiresAt": "2026-03-13T10:20:00.000Z",
  "reservationCount": 1
}
```

### Create and confirm payment attempt

Request:

```http
POST /api/payments/checkout-sessions/cm8checkout123/attempts
Content-Type: application/json
Cookie: velora_session=...

{
  "idempotencyKey": "pay-cm8checkout123-attempt-1"
}
```

### Create a platform-funded product promotion

Request:

```http
POST /api/promotions
Content-Type: application/json
Cookie: velora_session=...

{
  "name": "NordWave Edge S launch subsidy",
  "code": "EDGE-S-LAUNCH",
  "description": "Platform-funded launch discount for the Edge S hero offer.",
  "type": "FIXED_AMOUNT",
  "fundingSource": "PLATFORM",
  "stackingMode": "STACKABLE",
  "priority": 45,
  "isActive": true,
  "startsAt": "2026-03-18T09:00:00.000Z",
  "endsAt": "2026-03-31T21:00:00.000Z",
  "rules": [
    {
      "configuration": {
        "amount": 10000,
        "listingIds": ["seed-listing-phone-edge-s"]
      }
    }
  ]
}
```

Notes:

- `fundingSource` accepts `PLATFORM`, `SELLER`, or `SHARED`.
- `sellerFundingSharePercent` is required only for `SHARED`.
- Rule targeting can use listing IDs, category slugs, or coupon scope depending on the promotion type.
- Product and category promotions feed both checkout pricing and storefront merchandising, including current-price and compare-at presentation.

Response shape:

```json
{
  "attemptId": "cm8attempt123",
  "checkoutSessionId": "cm8checkout123",
  "provider": "stripe",
  "providerPaymentIntentId": "pi_test_123",
  "clientSecret": "pi_test_123_secret_abc",
  "status": "PENDING",
  "amount": {
    "amount": 219900,
    "currency": "RON"
  },
  "createdAt": "2026-03-13T10:01:00.000Z",
  "updatedAt": "2026-03-13T10:01:00.000Z"
}
```

Confirmation request:

```http
POST /api/payments/attempts/cm8attempt123/confirm
Content-Type: application/json
Cookie: velora_session=...

{
  "scenario": "success"
}
```

Confirmation response shape:

```json
{
  "attempt": {
    "attemptId": "cm8attempt123",
    "checkoutSessionId": "cm8checkout123",
    "provider": "stripe",
    "providerPaymentIntentId": "pi_test_123",
    "clientSecret": "pi_test_123_secret_abc",
    "status": "SUCCEEDED",
    "amount": {
      "amount": 219900,
      "currency": "RON"
    },
    "createdAt": "2026-03-13T10:01:00.000Z",
    "updatedAt": "2026-03-13T10:02:00.000Z"
  },
  "checkout": {
    "checkoutSessionId": "cm8checkout123",
    "cartId": "cm8cart123",
    "status": "COMPLETED",
    "amount": {
      "amount": 219900,
      "currency": "RON"
    },
    "reservationExpiresAt": "2026-03-13T10:20:00.000Z",
    "reservations": [],
    "discounts": [],
    "paymentAttempts": [],
    "order": {
      "orderId": "cm8order123",
      "number": "VLR-20260313-0001",
      "status": "PAID",
      "paymentStatus": "SUCCEEDED",
      "total": {
        "amount": 219900,
        "currency": "RON"
      },
      "subtotal": {
        "amount": 219900,
        "currency": "RON"
      },
      "discountTotal": {
        "amount": 0,
        "currency": "RON"
      },
      "itemCount": 1,
      "createdAt": "2026-03-13T10:02:00.000Z",
      "placedAt": "2026-03-13T10:02:00.000Z"
    }
  },
  "order": {
    "orderId": "cm8order123",
    "number": "VLR-20260313-0001",
    "status": "PAID",
    "paymentStatus": "SUCCEEDED",
    "total": {
      "amount": 219900,
      "currency": "RON"
    },
    "subtotal": {
      "amount": 219900,
      "currency": "RON"
    },
    "discountTotal": {
      "amount": 0,
      "currency": "RON"
    },
    "itemCount": 1,
    "createdAt": "2026-03-13T10:02:00.000Z",
    "placedAt": "2026-03-13T10:02:00.000Z"
  },
  "message": "Payment settled successfully."
}
```

## Webhook notes

- Stripe webhooks are received at `POST /payments/webhooks/stripe`.
- Raw request bodies are required for signature verification when real Stripe sandbox secrets are used.
- Every external event identifier is persisted so duplicate deliveries can be marked and ignored safely.
- Webhook processing updates `WebhookDeliveryRecord` and `PaymentEvent`, then applies business effects only once.

## Error handling

- Validation errors return `400` with flattened Zod validation output.
- Missing or invalid session access returns `401`.
- Role violations return `403`.
- Missing resources return `404`.
- Business-rule violations such as insufficient stock, invalid coupons, or invalid order transitions return `400`.
- Invalid promotion funding configurations, such as a shared campaign without a seller share, also return `400`.
- Replay-safe flows may return an already-settled view instead of failing when the same action is repeated with the same business identity.
- Seller onboarding activation fails closed: unknown, expired, or already-consumed tokens return safe errors without exposing internal review notes or operator metadata.
