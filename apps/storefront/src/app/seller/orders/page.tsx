import Link from "next/link";
import { Badge, Panel } from "@velora/ui";

import { StatusBadge } from "../../../components/status-badge";
import { formatDateTime, formatMoney } from "../../../lib/formatting";
import { getSellerOrders } from "../../../lib/storefront-api";

export const dynamic = "force-dynamic";

const secondaryLinkClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";

export default async function SellerOrdersPage(): Promise<React.JSX.Element> {
  const orders = await getSellerOrders();

  return (
    <div className="grid gap-6">
      <Panel className="space-y-5">
        <Badge>Seller orders</Badge>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              Monitor seller-scoped demand, payment, and fulfillment state.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Order totals on this page are limited to the active seller items
              so merchants never gain visibility into another seller revenue or
              product mix.
            </p>
          </div>
          <div className="rounded-[24px] bg-black/3 px-5 py-4 text-sm text-[var(--muted)]">
            {orders.length} order record(s)
          </div>
        </div>
      </Panel>

      {orders.length ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <article
              key={order.orderId}
              className="rounded-[28px] border border-[var(--stroke)] bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <Link
                    className="font-[var(--font-heading)] text-2xl font-bold tracking-tight"
                    href={`/seller/orders/${order.number}`}
                  >
                    {order.number}
                  </Link>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    {order.customer.label}
                    {order.customer.email ? ` / ${order.customer.email}` : ""}
                  </p>
                  <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                    Placed {formatDateTime(order.placedAt ?? order.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={order.status} />
                  <StatusBadge value={order.paymentStatus} />
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                <div className="rounded-[24px] bg-black/3 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Seller total
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                    {formatMoney(order.total)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-black/3 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Subtotal
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                    {formatMoney(order.subtotal)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-black/3 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Discounts
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                    {formatMoney(order.discountTotal)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-black/3 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Items
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                    {order.itemCount}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  className={secondaryLinkClass}
                  href={`/seller/orders/${order.number}`}
                >
                  View order detail
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Panel>
          <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
            No seller orders are available yet.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            The seeded merchant workspace will populate once orders reference the
            active seller listings.
          </p>
        </Panel>
      )}
    </div>
  );
}
