import Link from "next/link";

import { logoutAction } from "../app/account/actions";
import { getNotificationFeed, getSession } from "../lib/storefront-api";
import { StorefrontLogo } from "./storefront-logo";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/categories", label: "Categories" },
  { href: "/#trending", label: "Trending" },
  { href: "/#about", label: "About" }
] as const;

const navLinkClass =
  "inline-flex items-center py-2 text-sm font-semibold text-white/78 transition-colors hover:text-white";
const iconLinkClass =
  "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/86 transition-all hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/10 hover:text-white";
const utilityLinkClass =
  "inline-flex items-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78 transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/10 hover:text-white";

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
    <header className="relative px-2 pt-1 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <StorefrontLogo showTagline={false} tone="light" />

        <nav className="hidden items-center gap-7 lg:flex">
          {navItems.map((item, index) => (
            <div className="flex items-center gap-7" key={item.label}>
              <Link className={navLinkClass} href={item.href}>
                {item.label}
              </Link>
              {index < navItems.length - 1 ? (
                <span className="text-white/20">|</span>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2.5 lg:gap-3">
          {isSeller ? (
            <Link className={utilityLinkClass} href="/seller">
              Seller
            </Link>
          ) : null}
          {isAdmin ? (
            <a className={utilityLinkClass} href={adminWorkspaceUrl}>
              Admin
            </a>
          ) : null}
          {!isSeller && !isAdmin ? (
            <Link className={utilityLinkClass} href="/become-a-seller">
              Sell on Velora
            </Link>
          ) : null}

          {session ? (
            <Link
              aria-label="Notifications"
              className={iconLinkClass}
              href="/notifications"
            >
              <BellIcon />
              {unreadNotificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-[var(--foreground)]">
                  {unreadNotificationCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          <Link aria-label="Cart" className={iconLinkClass} href="/cart">
            <CartIcon />
          </Link>

          {session && isCustomer ? (
            <Link aria-label="Account" className={iconLinkClass} href="/account">
              <UserIcon />
            </Link>
          ) : null}

          {!session ? (
            <>
              <Link className={utilityLinkClass} href="/register">
                Register
              </Link>
              <Link aria-label="Login" className={iconLinkClass} href="/login">
                <UserIcon />
              </Link>
            </>
          ) : (
            <form action={logoutAction}>
              <button className={utilityLinkClass} type="submit">
                Sign out
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-4 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
    </header>
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
