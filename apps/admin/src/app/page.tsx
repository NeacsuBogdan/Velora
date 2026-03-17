import { Badge, Panel, StatTile } from "@velora/ui";

import { AdminLoginForm } from "../components/admin-login-form";
import { BackofficeConsole } from "../components/backoffice-console";
import {
  getAdminCatalogOptions,
  getAdminCategories,
  getAdminCustomers,
  getAdminDashboard,
  getAdminInventory,
  getAdminOperations,
  getAdminOrderDetail,
  getAdminOrders,
  getAdminProducts,
  getAdminSellers,
  getPromotions,
  getSession,
} from "../lib/admin-api";

export const dynamic = "force-dynamic";
const marketplaceUrl =
  process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

export default async function AdminHomePage(): Promise<React.JSX.Element> {
  const session = await getSession();
  const isAdmin =
    session?.user.roles.some((role) => role.code === "ADMIN") ?? false;
  const [
    dashboard,
    catalogOptions,
    categories,
    products,
    inventory,
    orders,
    customers,
    sellers,
    operations,
    promotions,
  ] = isAdmin
    ? await Promise.all([
        getAdminDashboard(),
        getAdminCatalogOptions(),
        getAdminCategories(),
        getAdminProducts(),
        getAdminInventory(),
        getAdminOrders(),
        getAdminCustomers(),
        getAdminSellers(),
        getAdminOperations(),
        getPromotions(),
      ])
    : [null, null, null, null, null, null, null, null, null, null];
  const orderDetail =
    isAdmin && orders?.[0] ? await getAdminOrderDetail(orders[0].number) : null;

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[32px] border border-[var(--stroke)] bg-[var(--surface)] p-6 shadow-[0_24px_72px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge>Admin workspace</Badge>
              <div>
                <h1 className="font-[var(--font-heading)] text-4xl font-semibold tracking-tight">
                  Velora backoffice is wired to the live marketplace operating
                  model.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                  Use the seeded admin account to manage catalog structure,
                  sellable offers, inventory posture, order workflows, pricing
                  controls, customer lookup, seller operations, and reindex
                  repair actions from a single control plane.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--stroke)] bg-white/80 px-5 py-4 text-sm text-[var(--muted)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-3">
                <div>
                  {session ? (
                    <>
                      Signed in as{" "}
                      <span className="font-semibold text-[var(--foreground)]">
                        {session.user.email}
                      </span>
                    </>
                  ) : (
                    "Admin session not established yet."
                  )}
                </div>
                <a
                  className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] transition-colors hover:border-[var(--accent)]"
                  href={marketplaceUrl}
                >
                  Open marketplace
                </a>
              </div>
            </div>
          </div>
        </header>

        {isAdmin ? (
          <>
            <section className="grid gap-5 md:grid-cols-3">
              <StatTile
                detail="Promotions loaded from the live transactional pricing engine."
                label="Promotions"
                value={String(promotions?.length ?? 0)}
              />
              <StatTile
                detail="Customer accounts seeded and available for support lookup."
                label="Customers"
                value={String(dashboard?.metrics.customers ?? 0)}
              />
              <StatTile
                detail="Orders still active in the fulfilment or payment lifecycle."
                label="Pending orders"
                value={String(dashboard?.metrics.pendingOrders ?? 0)}
              />
            </section>

            {dashboard &&
            catalogOptions &&
            categories &&
            products &&
            inventory &&
            orders &&
            customers &&
            sellers &&
            operations &&
            promotions ? (
              <BackofficeConsole
                catalogOptions={catalogOptions}
                categories={categories}
                customers={customers}
                dashboard={dashboard}
                inventory={inventory}
                operations={operations}
                orderDetail={orderDetail}
                orders={orders}
                products={products}
                promotions={promotions}
                sellers={sellers}
              />
            ) : null}
          </>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Panel>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Access required
              </p>
              <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-semibold tracking-tight">
                Sign in with the seeded admin account to manage promotions.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                The workspace writes directly to the live backoffice API, so
                authentication is required before catalog, order, seller, and
                promotion actions can be submitted.
              </p>
            </Panel>

            <AdminLoginForm />
          </div>
        )}
      </div>
    </main>
  );
}
