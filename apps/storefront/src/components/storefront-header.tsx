import Link from "next/link";

import { Badge } from "@velora/ui";

import { logoutAction } from "../app/account/actions";
import { getNotificationFeed, getSession } from "../lib/storefront-api";

const navLinkClass = "transition-colors hover:text-[var(--foreground)]";
const actionLinkClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";
const subtleButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";
const adminWorkspaceUrl =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

export async function StorefrontHeader(): Promise<React.JSX.Element> {
  const session = await getSession();
  const notificationFeed = session ? await getNotificationFeed(6) : null;
  const unreadNotificationCount = notificationFeed?.unreadCount ?? 0;
  const isSeller = session?.user.roles.some((role) => role.code === "SELLER");
  const isAdmin = session?.user.roles.some((role) => role.code === "ADMIN");
  const isCustomer = session?.user.roles.some((role) => role.code === "CUSTOMER");

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
          <div className="flex flex-col gap-3 lg:items-end">
            {session ? (
              <div className="text-sm text-[var(--muted)]">
                Signed in as{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {session.user.firstName} {session.user.lastName}
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-[var(--muted)]">
                <Link className={navLinkClass} href="/">
                  Home
                </Link>
                <Link className={navLinkClass} href="/categories">
                  Categories
                </Link>
                <Link className={navLinkClass} href="/products">
                  Products
                </Link>
                <Link className={navLinkClass} href="/search">
                  Search
                </Link>
                <Link className={navLinkClass} href="/cart">
                  Cart
                </Link>
                {!isSeller ? (
                  <Link className={navLinkClass} href="/become-a-seller">
                    Sell on Velora
                  </Link>
                ) : null}
                {session ? (
                  <Link className={navLinkClass} href="/notifications">
                    Notifications
                    {unreadNotificationCount > 0 ? (
                      <span className="ml-2 rounded-full bg-[var(--foreground)] px-2 py-0.5 text-[11px] font-semibold text-white">
                        {unreadNotificationCount}
                      </span>
                    ) : null}
                  </Link>
                ) : null}
                {session && isCustomer ? (
                  <Link className={navLinkClass} href="/account">
                    Account
                  </Link>
                ) : null}
                {isSeller ? (
                  <Link className={navLinkClass} href="/seller">
                    Seller
                  </Link>
                ) : null}
                {isAdmin ? (
                  <a className={navLinkClass} href={adminWorkspaceUrl}>
                    Admin
                  </a>
                ) : null}
              </nav>

              {session ? (
                <form action={logoutAction}>
                  <button className={subtleButtonClass} type="submit">
                    Sign out
                  </button>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Link className={subtleButtonClass} href="/register">
                    Register
                  </Link>
                  <Link className={actionLinkClass} href="/login">
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>

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
