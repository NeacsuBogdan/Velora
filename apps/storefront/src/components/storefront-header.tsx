import Link from "next/link";

import { Badge } from "@velora/ui";

import { logoutAction } from "../app/account/actions";
import { getNotificationFeed, getSession } from "../lib/storefront-api";
import { StorefrontLogo } from "./storefront-logo";

const navLinkClass =
  "inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white/74 transition-all hover:bg-white/10 hover:text-white";
const iconLinkClass =
  "relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/82 transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/10 hover:text-white";
const textActionClass =
  "inline-flex items-center justify-center rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-semibold text-white/88 transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/12";
const filledActionClass =
  "inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-soft),var(--accent))] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(139,94,255,0.36)] transition-transform hover:-translate-y-0.5";
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
    <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(44,18,92,0.95),rgba(19,10,47,0.94))] px-5 py-5 text-white shadow-[0_30px_90px_rgba(8,3,28,0.42)] backdrop-blur xl:px-8 xl:py-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)]" />
      <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(214,150,255,0.26),transparent_68%)] blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-72 rounded-full bg-[radial-gradient(circle,rgba(110,140,255,0.18),transparent_70%)] blur-2xl" />

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <StorefrontLogo />
            <Badge className="border-white/10 bg-white/8 text-white/68">
              Marketplace beta
            </Badge>
          </div>

          <nav className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-white/6 p-1.5 backdrop-blur">
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
            {!isSeller ? (
              <Link className={navLinkClass} href="/become-a-seller">
                Sell on Velora
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

          <div className="flex flex-wrap items-center gap-2">
            <Link aria-label="Cart" className={iconLinkClass} href="/cart">
              <CartIcon />
            </Link>
            {session ? (
              <Link
                aria-label="Notifications"
                className={iconLinkClass}
                href="/notifications"
              >
                <BellIcon />
                {unreadNotificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-[var(--foreground)]">
                    {unreadNotificationCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {session && isCustomer ? (
              <Link aria-label="Account" className={iconLinkClass} href="/account">
                <UserIcon />
              </Link>
            ) : null}

            {session ? (
              <>
                <div className="hidden rounded-full border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/72 lg:block">
                  Signed in as{" "}
                  <span className="font-semibold text-white">
                    {session.user.firstName} {session.user.lastName}
                  </span>
                </div>
                <form action={logoutAction}>
                  <button className={textActionClass} type="submit">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link className={textActionClass} href="/register">
                  Register
                </Link>
                <Link className={filledActionClass} href="/login">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <form
            action="/search"
            className="flex min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/8 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/72">
              <SearchIcon />
            </span>
            <input
              aria-label="Search products"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/42"
              name="q"
              placeholder="Search curated products, brands, and seller offers"
              type="search"
            />
            <button className={filledActionClass} type="submit">
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <Link className={textActionClass} href="/categories">
              Browse categories
            </Link>
            {!isSeller ? (
              <Link className={textActionClass} href="/become-a-seller">
                Start selling
              </Link>
            ) : null}
            <Link className={textActionClass} href="/products?sort=newest">
              New arrivals
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function SearchIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M10.75 4.75a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8.5 14.5l-3.35-3.35"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BellIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M9.5 19.25a2.5 2.5 0 0 0 5 0m-8.5-2h12l-1.3-1.65a2.24 2.24 0 0 1-.45-1.35v-2.9a4.25 4.25 0 1 0-8.5 0v2.9c0 .48-.16.95-.45 1.35L6 17.25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UserIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M12 12.5a4 4 0 1 0 0-8a4 4 0 0 0 0 8Zm-6.5 7c.66-2.79 3.12-4.75 6.5-4.75s5.84 1.96 6.5 4.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CartIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M3.75 5.25h1.5l1.8 8.1a1 1 0 0 0 .98.79h8.9a1 1 0 0 0 .97-.76l1.4-5.63H7.03M9.25 19.25a.75.75 0 1 1 0 1.5a.75.75 0 0 1 0-1.5Zm8 0a.75.75 0 1 1 0 1.5a.75.75 0 0 1 0-1.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
