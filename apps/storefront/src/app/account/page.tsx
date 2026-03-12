import Link from "next/link";
import { Badge, Panel, StatTile } from "@velora/ui";

import { AccountProfileForm } from "../../components/account-profile-form";
import { StatusBadge } from "../../components/status-badge";
import { formatDateTime, formatMoney } from "../../lib/formatting";
import {
  getCurrentUserProfile,
  getOrders,
  getUserAddresses
} from "../../lib/storefront-api";

export const dynamic = "force-dynamic";

const secondaryLinkClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";

export default async function AccountPage(): Promise<React.JSX.Element> {
  const [profile, addresses, orders] = await Promise.all([
    getCurrentUserProfile(),
    getUserAddresses(),
    getOrders()
  ]);

  if (!profile) {
    return (
      <Panel>
        <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
          Account details are temporarily unavailable.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Verify the API is running and the current session cookie is still
          valid, then refresh this page.
        </p>
      </Panel>
    );
  }

  const recentOrders = orders.slice(0, 3);
  const addressCoverage = [profile.defaultShippingAddress, profile.defaultBillingAddress]
    .filter(Boolean)
    .length;

  return (
    <div className="grid gap-6">
      <Panel className="space-y-5">
        <Badge>Account overview</Badge>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              Keep profile, delivery, and order data clean.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              The account workspace now reads from the same live customer
              profile, address, and order records used by checkout and post-purchase
              support flows.
            </p>
          </div>

          <div className="rounded-[24px] bg-black/3 px-5 py-4 text-sm text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">{profile.email}</p>
            <p className="mt-2">
              Active roles: {profile.roles.map((role) => role.name).join(", ")}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <StatTile
          label="Orders"
          value={profile.metrics.orderCount.toString()}
          detail={
            recentOrders.length
              ? `Most recent order ${recentOrders[0]?.number} is ${recentOrders[0]?.status.toLowerCase().replace(/_/g, " ")}.`
              : "Orders will appear here after checkout completes."
          }
        />
        <StatTile
          label="Saved addresses"
          value={profile.metrics.addressCount.toString()}
          detail={
            addresses.length
              ? `${addresses.filter((address) => address.isDefault).length} default address record(s) are active.`
              : "Add shipping and billing destinations for faster checkout."
          }
        />
        <StatTile
          label="Checkout readiness"
          value={`${addressCoverage}/2`}
          detail={
            addressCoverage === 2
              ? "Default shipping and billing addresses are both configured."
              : "Complete the address book so future checkout sessions start with cleaner customer data."
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Profile
            </p>
            <h3 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
              Personal details
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Update the name shown across account, cart, and checkout surfaces.
            </p>
          </div>

          <AccountProfileForm profile={profile} />
        </Panel>

        <Panel className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Default destinations
            </p>
            <h3 className="mt-3 font-[var(--font-heading)] text-2xl font-bold tracking-tight">
              Shipping and billing quick view
            </h3>
          </div>

          {[profile.defaultShippingAddress, profile.defaultBillingAddress].map(
            (address, index) => (
              <div
                key={address?.addressId ?? `empty-${index + 1}`}
                className="rounded-[24px] border border-[var(--stroke)] bg-white/80 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {index === 0 ? "Default shipping" : "Default billing"}
                </p>
                {address ? (
                  <div className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">
                      {address.fullName}
                    </p>
                    <p>{address.label}</p>
                    <p>{address.line1}</p>
                    {address.line2 ? <p>{address.line2}</p> : null}
                    <p>
                      {address.city}
                      {address.state ? `, ${address.state}` : ""} {address.postalCode}
                    </p>
                    <p>{address.countryCode}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    No default address is configured for this type yet.
                  </p>
                )}
              </div>
            )
          )}

          <Link className={secondaryLinkClass} href="/account/addresses">
            Manage address book
          </Link>
        </Panel>
      </div>

      <Panel className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Orders
            </p>
            <h3 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
              Recent order activity
            </h3>
          </div>
          <Link className={secondaryLinkClass} href="/account/orders">
            View all orders
          </Link>
        </div>

        {recentOrders.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {recentOrders.map((order) => (
              <article
                key={order.orderId}
                className="rounded-[24px] border border-[var(--stroke)] bg-white/85 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      className="text-lg font-semibold text-[var(--foreground)]"
                      href={`/account/orders/${order.number}`}
                    >
                      {order.number}
                    </Link>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Placed{" "}
                      {formatDateTime(order.placedAt ?? order.createdAt)}
                    </p>
                  </div>
                  <StatusBadge value={order.status} />
                </div>

                <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
                  <div className="flex items-center justify-between gap-4">
                    <span>Payment</span>
                    <StatusBadge value={order.paymentStatus} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Items</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {order.itemCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Total</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {formatMoney(order.total)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--stroke)] bg-white/70 p-8">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              No orders yet.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Browse the storefront, add products to the cart, and complete a
              checkout to populate the order history timeline.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
