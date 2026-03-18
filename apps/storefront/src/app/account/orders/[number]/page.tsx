import Link from "next/link";
import { Badge, Panel } from "@velora/ui";

import { StatusBadge } from "../../../../components/status-badge";
import { formatDateTime, formatMoney } from "../../../../lib/formatting";
import { formatStatusLabel } from "../../../../lib/status-label";
import { getOrderDetail } from "../../../../lib/storefront-api";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({
  params
}: {
  params: Promise<{ number: string }>;
}): Promise<React.JSX.Element> {
  const { number } = await params;
  const order = await getOrderDetail(number);
  const deliveryLines = order?.deliveryAddress
    ? [
        order.deliveryAddress.fullName,
        order.deliveryAddress.line1,
        order.deliveryAddress.line2,
        [order.deliveryAddress.city, order.deliveryAddress.state]
          .filter(Boolean)
          .join(", "),
        `${order.deliveryAddress.postalCode} ${order.deliveryAddress.countryCode}`,
        order.deliveryAddress.phone
      ].filter(Boolean)
    : [];

  if (!order) {
    return (
      <Panel>
        <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
          Order detail is unavailable.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          The requested order could not be resolved for the active session.
        </p>
        <div className="mt-6">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
            href="/account/orders"
          >
            Back to order history
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[32px] border border-[var(--stroke)] bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <Badge>Order detail</Badge>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
              {order.number}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              This view reflects the persisted post-checkout state, including
              discount snapshots, order status history, and refund records.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge value={order.status} />
            <StatusBadge value={order.paymentStatus} />
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
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--muted)]">Placed at</span>
                <span className="font-semibold">
                  {formatDateTime(order.placedAt ?? order.createdAt)}
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
                    {discount.description ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {discount.description}
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
              Delivery snapshot
            </p>
            {order.customer ? (
              <div className="grid gap-2 text-sm text-[var(--muted)]">
                <p className="font-semibold text-[var(--foreground)]">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p>{order.customer.email}</p>
                {order.customer.phone ? <p>{order.customer.phone}</p> : null}
              </div>
            ) : (
              <p className="text-sm leading-7 text-[var(--muted)]">
                This older order does not include a persisted delivery snapshot.
              </p>
            )}

            {deliveryLines.length ? (
              <div className="grid gap-2 border-t border-[var(--stroke)] pt-3 text-sm text-[var(--muted)]">
                {deliveryLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </Panel>

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
                    {formatStatusLabel(entry.status)}
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
                        {formatStatusLabel(refund.status)}
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
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {formatDateTime(refund.createdAt)}
                    </p>
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
  );
}
