import Link from "next/link";
import { Badge, Panel } from "@velora/ui";

import { LoginForm } from "../../../components/login-form";

const secondaryLinkClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";

export default function SellerLoginPage(): React.JSX.Element {
  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center lg:px-10">
      <section className="space-y-6">
        <Badge>Seller portal</Badge>
        <div className="space-y-5">
          <h1 className="font-[var(--font-heading)] text-5xl font-extrabold tracking-tight text-[var(--foreground)]">
            Sign in to operate your Velora merchant workspace.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            The seller portal uses the same session-cookie auth layer as the
            storefront, but routes, data, and inventory mutations are scoped to
            the linked merchant account.
          </p>
        </div>
        <Panel className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Merchant demo account
          </p>
          <p className="text-sm leading-7 text-[var(--muted)]">
            <code>seller@velora.local / Demo123!</code>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className={secondaryLinkClass} href="/become-a-seller">
              Apply to sell
            </Link>
            <Link className={secondaryLinkClass} href="/login">
              Customer login
            </Link>
          </div>
        </Panel>
      </section>

      <LoginForm
        defaultEmail="seller@velora.local"
        defaultRedirectPath="/seller"
      />
    </main>
  );
}
