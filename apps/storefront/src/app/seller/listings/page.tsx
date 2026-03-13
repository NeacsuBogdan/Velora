import { Badge, Panel } from "@velora/ui";

import { SellerInventoryManager } from "../../../components/seller-inventory-manager";
import { getSellerListings } from "../../../lib/storefront-api";

export const dynamic = "force-dynamic";

export default async function SellerListingsPage(): Promise<React.JSX.Element> {
  const listings = await getSellerListings();

  return (
    <div className="grid gap-6">
      <Panel className="space-y-5">
        <Badge>Seller listings</Badge>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              Manage stock and lead times without leaving the seller workspace.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Each update writes into transactional inventory, records an audit
              event, and refreshes the search projection so storefront
              availability stays aligned with merchant operations.
            </p>
          </div>
          <div className="rounded-[24px] bg-black/3 px-5 py-4 text-sm text-[var(--muted)]">
            {listings.length} listing record(s)
          </div>
        </div>
      </Panel>

      {listings.length ? (
        <SellerInventoryManager listings={listings} />
      ) : (
        <Panel>
          <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
            No seller listings are available.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Seed the API data or assign listings to the active merchant profile
            to populate this inventory workspace.
          </p>
        </Panel>
      )}
    </div>
  );
}
