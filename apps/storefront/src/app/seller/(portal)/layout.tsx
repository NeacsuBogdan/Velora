import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Button, Panel } from "@velora/ui";

import { SellerShellNav } from "../../../components/seller-shell-nav";
import { getSession } from "../../../lib/storefront-api";
import { logoutAction } from "../../account/actions";

export const dynamic = "force-dynamic";

const secondaryLinkClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";

export default async function SellerPortalLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const session = await getSession();

  if (!session) {
    redirect("/seller/login");
  }

  if (!session.user.roles.some((role) => role.code === "SELLER")) {
    redirect("/account");
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 lg:px-10">
      <header className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,32,47,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge>Seller portal</Badge>
            <div>
              <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
                {session.user.firstName} {session.user.lastName}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Signed in as {session.user.email}. Listings, orders, and
                inventory are constrained to the linked seller profile.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className={secondaryLinkClass} href="/products">
              View storefront
            </Link>
            <form action={logoutAction}>
              <Button type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <section className="grid gap-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Panel>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Merchant sections
            </p>
            <div className="mt-4">
              <SellerShellNav />
            </div>
          </Panel>
        </aside>
        <div>{children}</div>
      </section>
    </main>
  );
}
