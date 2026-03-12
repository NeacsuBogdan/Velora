import { Badge, Panel } from "@velora/ui";

import { AddressBook } from "../../../components/address-book";
import { getUserAddresses } from "../../../lib/storefront-api";

export const dynamic = "force-dynamic";

export default async function AccountAddressesPage(): Promise<React.JSX.Element> {
  const addresses = await getUserAddresses();

  return (
    <div className="grid gap-6">
      <Panel className="space-y-5">
        <Badge>Address book</Badge>
        <div>
          <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
            Manage delivery and billing destinations.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            Address records are stored against the authenticated account and can
            be marked as default shipping or billing destinations for future
            checkout sessions.
          </p>
        </div>
      </Panel>

      <AddressBook addresses={addresses} />
    </div>
  );
}
