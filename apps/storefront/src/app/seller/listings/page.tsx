import { Badge, Panel } from "@velora/ui";

import { SellerInventoryManager } from "../../../components/seller-inventory-manager";
import {
  getSellerListingCatalogOptions,
  getSellerListings
} from "../../../lib/storefront-api";

export const dynamic = "force-dynamic";

export default async function SellerListingsPage(): Promise<React.JSX.Element> {
  const [catalogOptions, listings] = await Promise.all([
    getSellerListingCatalogOptions(),
    getSellerListings()
  ]);

  return (
    <div className="grid gap-6">
      <Panel className="space-y-5">
        <Badge>Seller listings</Badge>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              Create, price, archive, and replenish your seller offers from one workspace.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Seller-owned offer changes write into transactional pricing,
              inventory, audit logs, and the search projection so storefront
              availability stays aligned with merchant operations.
            </p>
          </div>
          <div className="rounded-[24px] bg-black/3 px-5 py-4 text-sm text-[var(--muted)]">
            {listings.length} listing record(s)
          </div>
        </div>
      </Panel>

      <Panel className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Commercial scope
        </p>
        <p className="max-w-4xl text-sm leading-7 text-[var(--muted)]">
          Sellers manage their own offer pricing, compare-at positioning,
          visibility, stock, and lead time here. Platform-wide category and
          marketplace promotions remain in the admin pricing console so global
          discount logic stays deterministic.
        </p>
      </Panel>

      {listings.length ? (
        <SellerInventoryManager
          catalogOptions={catalogOptions}
          listings={listings}
        />
      ) : (
        <SellerInventoryManager
          catalogOptions={catalogOptions}
          listings={listings}
        />
      )}

      {!listings.length ? (
        <Panel>
          <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
            No seller listings are available.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Use the create-offer panel above to attach your first sellable offer
            to the shared marketplace catalog.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}
