import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, Panel } from "@velora/ui";

import { StorefrontChrome } from "../../../../components/storefront-chrome";
import { formatDateTime, formatMoney } from "../../../../lib/formatting";
import {
  getOrderDetail,
  getSession
} from "../../../../lib/storefront-api";

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  params
}: {
  params: Promise<{ number: string }>;
}): Promise<React.JSX.Element> {
  const session = await getSession();

  if (!session) {
    redirect("/login?from=/checkout");
  }

  const { number } = await params;
  const order = await getOrderDetail(number);

  return (
    <StorefrontChrome>
      {!order ? (
        <Panel>
          <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
            Order confirmation is unavailable.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            The order could not be resolved for the active session. Verify the
            number and try again from the account area.
          </p>
          <div className="mt-6">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
              href="/account"
            >
              Go to account
            </Link>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-6">
          <section className="rounded-[32px] border border-[var(--stroke)] bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <Badge>Order confirmed</Badge>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
                  {order.number}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                  Payment settled successfully and the reservation was consumed
                  into a real order record. The timeline below reflects the
                  operational state captured by Velora.
                </p>
              </div>

              <div className="grid gap-2 rounded-[24px] bg-black/3 px-5 py-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--muted)]">Order status</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {statusLabel(order.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--muted)]">Payment status</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {statusLabel(order.paymentStatus)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--muted)]">Placed at</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {order.placedAt
                      ? formatDateTime(order.placedAt)
                      : formatDateTime(order.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-5">
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                      Order total
                    </p>
                    <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
                      {formatMoney(order.total)}
                    </h2>
                  </div>
                  <div className="text-sm text-[var(--muted)]">
                    {order.itemCount} item(s)
                  </div>
                </div>

                <div className="mt-6 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--muted)]">Subtotal</span>
                    <span className="font-semibold">
                      {formatMoney(order.subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--muted)]">Discounts</span>
                    <span className="font-semibold">
                      {formatMoney(order.discountTotal)}
                    </span>
                  </div>
                </div>

                {order.discounts.length ? (
                  <div className="mt-6 grid gap-3 text-sm">
                    {order.discounts.map((discount) => (
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

              <div className="grid gap-4">
                {order.items.map((item) => (
                  <Panel key={item.orderItemId}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Link
                          className="font-[var(--font-heading)] text-2xl font-bold tracking-tight"
                          href={`/products/${item.slug}`}
                        >
                          {item.title}
                        </Link>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          Sold by{" "}
                          <span className="font-semibold text-[var(--foreground)]">
                            {item.seller.name}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <div className="rounded-[24px] bg-black/3 px-4 py-3 text-right text-sm">
                        <p className="text-[var(--muted)]">Line total</p>
                        <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                          {formatMoney(item.totalPrice)}
                        </p>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            </section>

            <aside className="space-y-5">
              <Panel className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Status timeline
                </p>
                <div className="grid gap-3">
                  {order.statusHistory.map((entry) => (
                    <div
                      key={`${entry.status}-${entry.createdAt}`}
                      className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-4"
                    >
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {statusLabel(entry.status)}
                      </p>
                      {entry.note ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {entry.note}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Refunds
                </p>
                {order.refunds.length ? (
                  <div className="grid gap-3">
                    {order.refunds.map((refund) => (
                      <div
                        key={refund.refundId}
                        className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-4 text-sm"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[var(--muted)]">
                            {statusLabel(refund.status)}
                          </span>
                          <span className="font-semibold text-[var(--foreground)]">
                            {formatMoney(refund.amount)}
                          </span>
                        </div>
                        {refund.reason ? (
                          <p className="mt-2 leading-6 text-[var(--muted)]">
                            {refund.reason}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    No refunds have been recorded for this order.
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
