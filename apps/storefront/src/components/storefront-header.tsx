import Link from "next/link";

import { Badge } from "@velora/ui";

export function StorefrontHeader(): React.JSX.Element {
  return (
    <header className="rounded-[32px] border border-[var(--stroke)] bg-white/85 px-6 py-5 shadow-[0_20px_60px_rgba(16,32,47,0.08)] backdrop-blur">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
              Velora
            </p>
            <Badge>Marketplace beta</Badge>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
            Premium browsing for catalog, search, and operationally honest
            commerce flows.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:items-end">
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-[var(--muted)]">
            <Link href="/">Home</Link>
            <Link href="/categories">Categories</Link>
            <Link href="/products">Products</Link>
            <Link href="/search">Search</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/account">Account</Link>
            <Link href="/seller">Seller</Link>
            <Link href="/login">Login</Link>
          </nav>

          <form
            action="/search"
            className="flex w-full min-w-0 items-center gap-2 rounded-full border border-[var(--stroke)] bg-[rgba(244,244,241,0.8)] px-2 py-2 lg:w-[420px]"
          >
            <input
              aria-label="Search products"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
              name="q"
              placeholder="Search phones, appliances, fitness gear"
              type="search"
            />
            <button
              className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[color:rgba(16,32,47,0.84)]"
              type="submit"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
