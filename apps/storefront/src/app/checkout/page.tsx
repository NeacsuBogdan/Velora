import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, Panel } from "@velora/ui";

import { CheckoutPaymentControls } from "../../components/checkout-payment-controls";
import { StorefrontChrome } from "../../components/storefront-chrome";
import { formatDateTime, formatMoney } from "../../lib/formatting";
import {
  getCheckoutSession,
  getSession
} from "../../lib/storefront-api";

type SearchParams = Record<string, string | string[] | undefined>;

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}): Promise<React.JSX.Element> {
  const session = await getSession();

  if (!session) {
    redirect("/login?from=/checkout");
  }

  const resolvedSearchParams = await searchParams;
  const checkoutSessionId = Array.isArray(resolvedSearchParams.session)
    ? resolvedSearchParams.session[0]
    : resolvedSearchParams.session;

  if (!checkoutSessionId) {
    return (
      <StorefrontChrome>
        <Panel>
          <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
            Checkout session is missing.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Start checkout from the cart so Velora can reserve stock before the
            payment attempt begins.
          </p>
          <div className="mt-6">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
              href="/cart"
            >
              Return to cart
            </Link>
          </div>
        </Panel>
      </StorefrontChrome>
    );
  }

  const checkout = await getCheckoutSession(checkoutSessionId);

  return (
    <StorefrontChrome>
      {!checkout ? (
        <Panel>
          <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
            Checkout session is unavailable.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            The reservation may have expired or the session no longer belongs to
            the active customer account.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
              href="/cart"
            >
              Return to cart
            </Link>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-6">
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <Badge>Checkout</Badge>
              <div>
                <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
                  Payment is protected by an active stock reservation window.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                  Confirm the reserved items, then run the sandbox payment flow.
                  The order is created only after settlement succeeds.
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
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
                    href="/cart"
                  >
                    Back to cart
                  </Link>
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
      )}
    </StorefrontChrome>
  );
}
