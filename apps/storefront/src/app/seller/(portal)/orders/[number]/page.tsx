import Link from "next/link";
import { Badge, Panel } from "@velora/ui";

import { SellerOrderStatusForm } from "../../../../../components/seller-order-status-form";
import { StatusBadge } from "../../../../../components/status-badge";
import { formatDateTime, formatMoney } from "../../../../../lib/formatting";
import { formatStatusLabel } from "../../../../../lib/status-label";
import { getSellerOrderDetail } from "../../../../../lib/storefront-api";

export const dynamic = "force-dynamic";

export default async function SellerOrderDetailPage({
  params
}: {
  params: Promise<{ number: string }>;
}): Promise<React.JSX.Element> {
  const { number } = await params;
  const order = await getSellerOrderDetail(number);
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
          Seller order detail is unavailable.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          The requested order could not be resolved for the active seller scope.
        </p>
        <div className="mt-6">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
            href="/seller/orders"
          >
            Back to seller orders
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[32px] border border-[var(--stroke)] bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <Badge>Seller order detail</Badge>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
              {order.number}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Customer contact, delivery snapshot, seller-scoped items, and
              fulfillment history are filtered to the active merchant account.
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
                  Seller total
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
                <span className="text-[var(--muted)]">Customer</span>
                <span className="font-semibold">{order.customer.label}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--muted)]">Customer email</span>
                <span className="font-semibold">
                  {order.customerContact?.email ??
                    order.customer.email ??
                    "Guest checkout"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--muted)]">Customer phone</span>
                <span className="font-semibold">
                  {order.customerContact?.phone ??
                    order.deliveryAddress?.phone ??
                    "Not provided"}
                </span>
              </div>
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

            {order.settlement ? (
              <div className="mt-6 grid gap-3 border-t border-[var(--stroke)] pt-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--muted)]">Gross merchandise</span>
                  <span className="font-semibold">
                    {formatMoney(order.settlement.grossAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--muted)]">Seller-funded discount</span>
                  <span className="font-semibold">
                    -{formatMoney(order.settlement.sellerDiscountAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--muted)]">Platform-funded discount</span>
                  <span className="font-semibold">
                    {formatMoney(order.settlement.platformDiscountAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--muted)]">Expected payout</span>
                  <span className="font-semibold">
                    {formatMoney(order.settlement.netPayoutAmount)}
                  </span>
                </div>
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
              Delivery contact
            </p>
            {order.customerContact ? (
              <div className="grid gap-2 text-sm text-[var(--muted)]">
                <p className="font-semibold text-[var(--foreground)]">
                  {order.customerContact.firstName} {order.customerContact.lastName}
                </p>
                <p>{order.customerContact.email}</p>
                {order.customerContact.phone ? (
                  <p>{order.customerContact.phone}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-7 text-[var(--muted)]">
                This order does not include a persisted customer contact snapshot.
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

          <SellerOrderStatusForm
            availableNextStatuses={order.availableNextStatuses}
            canManageStatus={order.canManageStatus}
            currentStatus={order.status}
            orderNumber={order.number}
            statusManagementNote={order.statusManagementNote}
          />

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
                No refunds have been recorded for this seller scope.
              </p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
