import Image from "next/image";
import Link from "next/link";

import { Badge, Panel } from "@velora/ui";

import { CartCouponForm } from "../../components/cart-coupon-form";
import { CartItemActions } from "../../components/cart-item-actions";
import { StartCheckoutButton } from "../../components/start-checkout-button";
import { StorefrontChrome } from "../../components/storefront-chrome";
import { formatDateTime, formatMoney } from "../../lib/formatting";
import { getCart, getSession } from "../../lib/storefront-api";

export const dynamic = "force-dynamic";

export default async function CartPage(): Promise<React.JSX.Element> {
  const session = await getSession();
  const cart = await getCart();

  return (
    <StorefrontChrome>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Badge>Customer cart</Badge>
          <div>
            <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
              Review cart quantities before stock is reserved.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              The cart stays flexible until checkout starts. Once you reserve
              stock, Velora holds the requested units for a limited window so
              the payment flow can proceed without overselling.
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
              Guest cart with{" "}
              <span className="font-semibold text-[var(--foreground)]">
                no account required
              </span>
            </>
          )}
        </div>
      </section>

      {!cart ? (
        <Panel>
          <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
            Cart data is unavailable.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Verify the API is running and the session cookie is still valid.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5">
            {cart.activeCheckout ? (
              <Panel className="border-[rgba(18,102,79,0.18)] bg-[rgba(18,102,79,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(18,102,79,0.8)]">
                  Reservation active
                </p>
                <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                  Stock is held until{" "}
                  {formatDateTime(cart.activeCheckout.reservationExpiresAt)}.
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {cart.activeCheckout.reservedUnits} units are reserved across{" "}
                  {cart.activeCheckout.reservationCount} cart lines. Any cart
                  change will release the current hold and force a fresh
                  reservation.
                </p>
              </Panel>
            ) : null}

            {cart.items.length ? (
              <div className="grid gap-4">
                {cart.items.map((item) => (
                  <Panel
                    key={item.itemId}
                    className="grid gap-5 lg:grid-cols-[120px_minmax(0,1fr)_200px]"
                  >
                    <div className="flex aspect-square items-center justify-center rounded-[24px] bg-[linear-gradient(160deg,rgba(248,246,241,0.96),rgba(233,238,243,0.96))] p-4">
                      {item.image ? (
                        <Image
                          alt={item.image.altText}
                          className="h-full w-full object-contain"
                          height={360}
                          src={item.image.url}
                          width={360}
                        />
                      ) : (
                        <div className="text-sm text-[var(--muted)]">No image</div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Link
                          className="font-[var(--font-heading)] text-2xl font-bold tracking-tight"
                          href={`/products/${item.slug}`}
                        >
                          {item.title}
                        </Link>
                        {item.subtitle ? (
                          <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 text-sm text-[var(--muted)]">
                        <p>
                          Seller:{" "}
                          <span className="font-semibold text-[var(--foreground)]">
                            {item.seller.name}
                          </span>
                        </p>
                        <p>
                          Availability:{" "}
                          {item.availability.inStock
                            ? `${item.availability.availableQuantity} units available`
                            : "Out of stock"}
                        </p>
                        <p>
                          Lead time: {item.availability.leadTimeDays} day(s)
                        </p>
                        {!item.canFulfill ? (
                          <p className="font-semibold text-[var(--accent)]">
                            Current stock is lower than the cart quantity.
                          </p>
                        ) : null}
                      </div>

                      <CartItemActions itemId={item.itemId} quantity={item.quantity} />
                    </div>

                    <div className="space-y-3 rounded-[24px] bg-black/3 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                          Unit price
                        </p>
                        <p className="mt-2 text-2xl font-bold tracking-tight">
                          {formatMoney(item.pricing.unit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                          Line total
                        </p>
                        <p className="mt-2 text-2xl font-bold tracking-tight">
                          {formatMoney(item.pricing.lineTotal)}
                        </p>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            ) : (
              <Panel>
                <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                  The cart is empty.
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Browse the catalog, compare seller offers, and add a product
                  from its detail page.
                </p>
                <div className="mt-6">
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
                    href="/products"
                  >
                    Browse products
                  </Link>
                </div>
              </Panel>
            )}
          </section>

          <aside className="space-y-5">
            <Panel className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Cart totals
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

              <CartCouponForm couponCode={cart.couponCode} />

              {cart.discounts.length ? (
                <div className="grid gap-3 text-sm">
                  {cart.discounts.map((discount) => (
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

              <StartCheckoutButton
                activeCheckoutSessionId={cart.activeCheckout?.checkoutSessionId}
                disabled={cart.items.length === 0}
                label="Continue to checkout"
              />
            </Panel>

            <Panel className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Operational notes
              </p>
              <div className="grid gap-3 text-sm leading-7 text-[var(--muted)]">
                {cart.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </Panel>
          </aside>
        </div>
      )}
    </StorefrontChrome>
  );
}
