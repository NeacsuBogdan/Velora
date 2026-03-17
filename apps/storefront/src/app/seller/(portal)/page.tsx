import Link from "next/link";
import { Badge, Panel, StatTile } from "@velora/ui";

import { StatusBadge } from "../../../components/status-badge";
import { formatDateTime, formatMoney } from "../../../lib/formatting";
import {
  getSellerDashboard,
  getSellerListings,
  getSellerOrders
} from "../../../lib/storefront-api";

export const dynamic = "force-dynamic";

const secondaryLinkClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";

export default async function SellerOverviewPage(): Promise<React.JSX.Element> {
  const [dashboard, listings, orders] = await Promise.all([
    getSellerDashboard(),
    getSellerListings(),
    getSellerOrders()
  ]);

  if (!dashboard) {
    return (
      <Panel>
        <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
          Seller metrics are unavailable.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Start the API and sign in with the seeded merchant account to load the
          seller workspace.
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[32px] border border-[var(--stroke)] bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <Badge>Merchant dashboard</Badge>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
              {dashboard.seller.displayName}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Daily seller operations combine live stock posture, open order
              pressure, and listing state from the same commerce engine used by
              the customer storefront.
            </p>
          </div>

          <StatusBadge value={dashboard.seller.status} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatTile
          detail="Listings currently visible to shoppers."
          label="Active listings"
          value={dashboard.metrics.activeListings.toString()}
        />
        <StatTile
          detail="Offers that need stock attention."
          label="Low stock"
          value={dashboard.metrics.lowStockListings.toString()}
        />
        <StatTile
          detail="Units available above reservations and safety stock."
          label="Available units"
          value={dashboard.metrics.availableUnits.toString()}
        />
        <StatTile
          detail="Units already reserved by live checkout sessions."
          label="Reserved units"
          value={dashboard.metrics.reservedUnits.toString()}
        />
        <StatTile
          detail="Orders still moving through payment or fulfillment."
          label="Open orders"
          value={dashboard.metrics.openOrders.toString()}
        />
        <StatTile
          detail="All orders containing the active seller listings."
          label="Total orders"
          value={dashboard.metrics.totalOrders.toString()}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Inventory pulse
              </p>
              <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                Recent listings
              </h2>
            </div>
            <Link className={secondaryLinkClass} href="/seller/listings">
              Manage listings
            </Link>
          </div>

          <div className="grid gap-3">
            {listings.slice(0, 4).map((listing) => (
              <article
                key={listing.listingId}
                className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {listing.title}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      SKU {listing.sellerSku}
                    </p>
                  </div>
                  <StatusBadge value={listing.status} />
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-[var(--muted)]">Available</p>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {listing.inventory.availableQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Reserved</p>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {listing.inventory.reserved}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Lead time</p>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {listing.leadTimeDays} day(s)
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Operational notes
          </p>
          <div className="grid gap-3">
            {dashboard.notes.map((note) => (
              <div
                key={note}
                className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-4 text-sm leading-7 text-[var(--muted)]"
              >
                {note}
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Fulfillment pulse
            </p>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
              Recent seller orders
            </h2>
          </div>
          <Link className={secondaryLinkClass} href="/seller/orders">
            View all orders
          </Link>
        </div>

        {orders.length ? (
          <div className="grid gap-3">
            {orders.slice(0, 4).map((order) => (
              <article
                key={order.orderId}
                className="rounded-[24px] border border-[var(--stroke)] bg-white/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link
                      className="font-semibold text-[var(--foreground)]"
                      href={`/seller/orders/${order.number}`}
                    >
                      {order.number}
                    </Link>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {order.customer.label}
                      {order.customer.email ? ` / ${order.customer.email}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={order.status} />
                    <StatusBadge value={order.paymentStatus} />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-[var(--muted)]">Seller total</p>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {formatMoney(order.total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Items</p>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {order.itemCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Placed</p>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {formatDateTime(order.placedAt ?? order.createdAt)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-[var(--muted)]">
            No seller orders are available yet for this account.
          </p>
        )}
      </Panel>
    </div>
  );
}
