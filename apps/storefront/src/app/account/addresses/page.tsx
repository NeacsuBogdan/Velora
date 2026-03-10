import { Panel } from "@velora/ui";

export const dynamic = "force-dynamic";

export default function AccountAddressesPage(): React.JSX.Element {
  return (
    <Panel>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        Address shell
      </p>
      <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
        Address management lands in the next account stage.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
        The protected account shell is active, but seeded addresses are not yet
        part of the customer UX. This page is reserved so the navigation and
        route protection shape stay stable as the account area grows.
      </p>
    </Panel>
  );
}
