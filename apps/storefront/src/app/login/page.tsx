import { Badge } from "@velora/ui";
import Link from "next/link";

import { LoginForm } from "../../components/login-form";

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center lg:px-10">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Customer auth</Badge>
          <Link
            className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            href="/"
          >
            Back to marketplace
          </Link>
        </div>
        <div className="space-y-5">
          <h1 className="font-[var(--font-heading)] text-5xl font-extrabold tracking-tight text-[var(--foreground)]">
            Sign in to the Velora customer workspace.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            The login flow is wired directly into the shared cookie-based
            session layer, so the storefront can move into account, cart, and
            checkout work without switching authentication models.
          </p>
        </div>
        <div className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,32,47,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Demo accounts
          </p>
          <ul className="mt-4 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            <li>
              <code>customer@velora.local / Demo123!</code>
            </li>
            <li>
              <code>admin@velora.local / Demo123!</code>
            </li>
            <li>
              <code>seller@velora.local / Demo123!</code>
            </li>
          </ul>
          <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
            New customer accounts can register directly from the storefront.
          </p>
        </div>
      </section>

      <LoginForm />
    </main>
  );
}
