import { Badge, Panel } from "@velora/ui";

import { SellerPromotionManager } from "../../../../components/seller-promotion-manager";
import {
  getSellerListings,
  getSellerPromotions
} from "../../../../lib/storefront-api";

export const dynamic = "force-dynamic";

export default async function SellerPromotionsPage(): Promise<React.JSX.Element> {
  const [listings, promotions] = await Promise.all([
    getSellerListings(),
    getSellerPromotions()
  ]);

  return (
    <div className="grid gap-6">
      <Panel className="space-y-5">
        <Badge>Seller promotions</Badge>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              Manage merchant-funded campaigns without leaving the seller workspace.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Build offer-specific, category-scoped, and bundle campaigns for your
              own catalog footprint while keeping platform-funded pricing under
              backoffice control.
            </p>
          </div>
          <div className="rounded-[24px] bg-black/3 px-5 py-4 text-sm text-[var(--muted)]">
            {promotions.length} seller campaign(s)
          </div>
        </div>
      </Panel>

      <SellerPromotionManager listings={listings} promotions={promotions} />
    </div>
  );
}
