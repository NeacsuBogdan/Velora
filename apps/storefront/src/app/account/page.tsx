import { Panel } from "@velora/ui";

import { OverviewPanel } from "../../components/overview-panel";
import {
  getAuthenticatedOverview,
  getSession
} from "../../lib/storefront-api";

export const dynamic = "force-dynamic";

export default async function AccountPage(): Promise<React.JSX.Element> {
  const session = await getSession();
  const [ordersOverview, cartOverview, checkoutOverview] = await Promise.all([
    getAuthenticatedOverview("/orders/overview"),
    getAuthenticatedOverview("/cart/overview"),
    getAuthenticatedOverview("/checkout/overview")
  ]);

  return (
    <div className="grid gap-5">
      <Panel>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Session summary
        </p>
        <h2 className="mt-4 font-[var(--font-heading)] text-2xl font-bold tracking-tight">
          Customer shell is attached to the live API session.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Active roles: {session?.user.roles.map((role) => role.name).join(", ")}.
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <OverviewPanel
          title="Order activity"
          eyebrow="Orders"
          overview={ordersOverview}
          emptyCopy="Order metrics will appear once the customer session resolves against the API."
        />
        <OverviewPanel
          title="Cart activity"
          eyebrow="Cart"
          overview={cartOverview}
          emptyCopy="Cart metrics will appear once the customer session resolves against the API."
        />
      </div>

      <OverviewPanel
        title="Checkout activity"
        eyebrow="Checkout"
        overview={checkoutOverview}
        emptyCopy="Checkout metrics will appear once the customer session resolves against the API."
      />
    </div>
  );
}
