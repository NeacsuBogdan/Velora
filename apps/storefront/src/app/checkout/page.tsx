import Link from "next/link";

import { Badge, Panel } from "@velora/ui";

import { CheckoutPaymentControls } from "../../components/checkout-payment-controls";
import { CheckoutSessionForm } from "../../components/checkout-session-form";
import { StorefrontChrome } from "../../components/storefront-chrome";
import { formatDateTime, formatMoney } from "../../lib/formatting";
import {
  getCart,
  getCheckoutSession,
  getCurrentUserProfile,
  getSession
} from "../../lib/storefront-api";

type SearchParams = Record<string, string | string[] | undefined>;

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatAddress(address: {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  countryCode: string;
  phone: string | null;
}) {
  return [
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(", "),
    `${address.postalCode} ${address.countryCode}`,
    address.phone
  ].filter(Boolean);
}

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}): Promise<React.JSX.Element> {
  const session = await getSession();
  const profile = session ? await getCurrentUserProfile() : null;
  const cart = await getCart();
  const resolvedSearchParams = await searchParams;
  const checkoutSessionId = Array.isArray(resolvedSearchParams.session)
    ? resolvedSearchParams.session[0]
    : resolvedSearchParams.session;
  const checkout = checkoutSessionId
    ? await getCheckoutSession(checkoutSessionId)
    : null;
  const defaultShippingAddress = profile?.defaultShippingAddress;

  const defaultValues = {
    firstName: profile?.firstName ?? session?.user.firstName ?? "",
    lastName: profile?.lastName ?? session?.user.lastName ?? "",
    email: profile?.email ?? session?.user.email ?? "",
    contactPhone: defaultShippingAddress?.phone ?? "",
    fullName:
      defaultShippingAddress?.fullName ??
      [profile?.firstName ?? session?.user.firstName, profile?.lastName ?? session?.user.lastName]
        .filter(Boolean)
        .join(" "),
    line1: defaultShippingAddress?.line1 ?? "",
    line2: defaultShippingAddress?.line2 ?? "",
    city: defaultShippingAddress?.city ?? "",
    state: defaultShippingAddress?.state ?? "",
    postalCode: defaultShippingAddress?.postalCode ?? "",
    countryCode: defaultShippingAddress?.countryCode ?? "RO",
    deliveryPhone: defaultShippingAddress?.phone ?? ""
  };

  return (
    <StorefrontChrome>
      {checkoutSessionId && !checkout ? (
        <Panel>
          <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
            Checkout session is unavailable.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            The reservation may have expired or the session no longer belongs to
            the active customer or guest checkout context.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
              href="/cart"
            >
              Return to cart
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
              href="/checkout"
            >
              Start checkout again
            </Link>
          </div>
        </Panel>
      ) : checkout ? (
        <div className="grid gap-6">
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <Badge>
                {checkout.checkoutMode === "guest"
                  ? "Guest checkout"
                  : "Account checkout"}
              </Badge>
              <div>
                <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
                  Payment is protected by an active stock reservation window.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                  Contact and delivery details are now frozen for this checkout
                  session. Confirm the reserved items, then run the sandbox
                  payment flow.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--stroke)] bg-white/80 px-5 py-4 text-sm text-[var(--muted)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              Status{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {statusLabel(checkout.status)}
              </span>
              {checkout.reservationExpiresAt ? (
                <>
                  {" "}until{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {formatDateTime(checkout.reservationExpiresAt)}
                  </span>
                </>
              ) : null}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-5">
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                      Reserved total
                    </p>
                    <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
                      {formatMoney(checkout.amount)}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
                      href="/checkout"
                    >
                      Edit delivery details
                    </Link>
                    <Link
                      className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
                      href="/cart"
                    >
                      Back to cart
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                      Customer contact
                    </p>
                    {checkout.customer ? (
                      <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                        <p className="font-semibold text-[var(--foreground)]">
                          {checkout.customer.firstName} {checkout.customer.lastName}
                        </p>
                        <p>{checkout.customer.email}</p>
                        {checkout.customer.phone ? <p>{checkout.customer.phone}</p> : null}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                        This legacy checkout session does not have a persisted
                        contact snapshot.
                      </p>
                    )}
                  </div>

                  <div className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                      Delivery address
                    </p>
                    {checkout.deliveryAddress ? (
                      <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
                        {formatAddress(checkout.deliveryAddress).map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                        This legacy checkout session does not have a persisted
                        delivery snapshot.
                      </p>
                    )}
                  </div>
                </div>

                {checkout.discounts.length ? (
                  <div className="mt-6 grid gap-3 text-sm">
                    {checkout.discounts.map((discount) => (
                      <div
                        key={`${discount.label}-${discount.couponCode ?? "auto"}`}
                        className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium text-[var(--foreground)]">
                            {discount.label}
                          </span>
                          <span className="font-semibold text-[var(--foreground)]">
                            -{formatMoney(discount.amount)}
                          </span>
                        </div>
                        {discount.couponCode ? (
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                            Coupon {discount.couponCode}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Panel>

              {checkout.reservations.length ? (
                <div className="grid gap-4">
                  {checkout.reservations.map((reservation) => (
                    <Panel key={reservation.reservationId}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <Link
                            className="font-[var(--font-heading)] text-2xl font-bold tracking-tight"
                            href={`/products/${reservation.slug}`}
                          >
                            {reservation.title}
                          </Link>
                          {reservation.subtitle ? (
                            <p className="text-sm font-medium text-[var(--muted)]">
                              {reservation.subtitle}
                            </p>
                          ) : null}
                          <div className="grid gap-1 text-sm text-[var(--muted)]">
                            <p>
                              Seller:{" "}
                              <span className="font-semibold text-[var(--foreground)]">
                                {reservation.seller.name}
                              </span>
                            </p>
                            <p>Reserved quantity: {reservation.quantity}</p>
                            <p>
                              Hold expires at {formatDateTime(reservation.expiresAt)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[24px] bg-black/3 px-4 py-3 text-sm text-[var(--muted)]">
                          Listing{" "}
                          <span className="font-mono text-xs text-[var(--foreground)]">
                            {reservation.listingId}
                          </span>
                        </div>
                      </div>
                    </Panel>
                  ))}
                </div>
              ) : (
                <Panel>
                  <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                    No active reservations remain.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    The checkout session exists, but the hold was already
                    released or consumed by a previous payment outcome.
                  </p>
                </Panel>
              )}
            </section>

            <aside className="space-y-5">
              <Panel className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Payment sandbox
                  </p>
                  <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                    Run the checkout lifecycle.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    Each action maps to the payment attempt, webhook-safe
                    settlement, and order creation logic in the API.
                  </p>
                </div>

                <CheckoutPaymentControls
                  checkoutSessionId={checkout.checkoutSessionId}
                  initialAttempt={checkout.paymentAttempts[0] ?? null}
                  initialOrderNumber={checkout.order?.number ?? null}
                  initialStatus={checkout.status}
                />
              </Panel>

              <Panel className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Payment history
                </p>
                {checkout.paymentAttempts.length ? (
                  <div className="grid gap-3 text-sm">
                    {checkout.paymentAttempts.map((attempt) => (
                      <div
                        key={attempt.attemptId}
                        className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[var(--muted)]">
                            {attempt.provider}
                          </span>
                          <span className="font-semibold text-[var(--foreground)]">
                            {statusLabel(attempt.status)}
                          </span>
                        </div>
                        <p className="mt-3 font-mono text-xs text-[var(--muted)]">
                          {attempt.providerPaymentIntentId ?? "no provider intent yet"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    No payment attempts exist yet for this reservation.
                  </p>
                )}
              </Panel>
            </aside>
          </div>
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <Panel>
          <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
            Checkout starts once the cart has at least one item.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Add products to the cart first, then provide the delivery details
            needed for the reservation and payment flow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
              href="/products"
            >
              Browse products
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
              href="/cart"
            >
              Open cart
            </Link>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-6">
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <Badge>{session ? "Account checkout" : "Guest checkout"}</Badge>
              <div>
                <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
                  Confirm who receives the order before stock is reserved.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                  Velora captures the delivery contact first, then starts the
                  reservation window and payment flow. Account creation is not
                  required for checkout.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--stroke)] bg-white/80 px-5 py-4 text-sm text-[var(--muted)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              {session ? (
                <>
                  Signed in as{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {session.user.firstName} {session.user.lastName}
                  </span>
                </>
              ) : (
                <>
                  Guest checkout with{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    no account required
                  </span>
                </>
              )}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <CheckoutSessionForm
              defaultValues={defaultValues}
              isSignedIn={Boolean(session)}
            />

            <aside className="space-y-5">
              <Panel className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Checkout total
                  </p>
                  <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
                    {formatMoney(cart.totals.total)}
                  </h2>
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--muted)]">Subtotal</span>
                    <span className="font-semibold">
                      {formatMoney(cart.totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--muted)]">Discounts</span>
                    <span className="font-semibold">
                      {formatMoney(cart.totals.discountTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-[var(--stroke)] pt-3">
                    <span className="text-[var(--muted)]">Items</span>
                    <span className="font-semibold">{cart.itemCount}</span>
                  </div>
                </div>
              </Panel>

              <Panel className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Cart summary
                </p>
                <div className="grid gap-3 text-sm">
                  {cart.items.map((item) => (
                    <div
                      key={item.itemId}
                      className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">
                            {item.title}
                          </p>
                          {item.subtitle ? (
                            <p className="mt-1 text-[var(--muted)]">
                              {item.subtitle}
                            </p>
                          ) : null}
                          <p className="mt-2 text-[var(--muted)]">
                            {item.quantity} x {formatMoney(item.pricing.unit)}
                          </p>
                        </div>
                        <span className="font-semibold text-[var(--foreground)]">
                          {formatMoney(item.pricing.lineTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Need a saved address book?
                </p>
                <p className="text-sm leading-7 text-[var(--muted)]">
                  {session
                    ? "This checkout uses a frozen delivery snapshot, even if you later change the address book in your account."
                    : "You can finish this order as a guest now, or sign in first if you want saved addresses and order history in the account area."}
                </p>
                {!session ? (
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
                    href="/login?from=/checkout"
                  >
                    Sign in before checkout
                  </Link>
                ) : null}
              </Panel>
            </aside>
          </div>
        </div>
      )}
    </StorefrontChrome>
  );
}

