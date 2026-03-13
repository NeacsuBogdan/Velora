"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { sellerNavigation } from "../lib/seller-navigation";

export function SellerShellNav(): React.JSX.Element {
  const currentPath = usePathname();

  return (
    <nav className="grid gap-3">
      {sellerNavigation.map((item) => {
        const isActive = item.href === currentPath;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-3xl border px-4 py-4 transition-colors ${
              isActive
                ? "border-[var(--accent)] bg-[var(--accent)]/8"
                : "border-[var(--stroke)] bg-white hover:border-[var(--foreground)]/30"
            }`}
          >
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {item.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {item.description}
            </p>
          </Link>
        );
      })}
    </nav>
  );
}
