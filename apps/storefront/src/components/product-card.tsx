import Image from "next/image";
import Link from "next/link";

import type { ProductListItem } from "@velora/contracts";

import { AddToCartButton } from "./add-to-cart-button";
import { formatMoney } from "../lib/formatting";

export function ProductCard({
  item
}: {
  item: ProductListItem;
}): React.JSX.Element {
  const statusLabel = item.pricing.discountPercentage
    ? `-${item.pricing.discountPercentage}%`
    : item.availability.availableQuantity <= 5
      ? "Limited"
      : item.availability.inStock
        ? "Live"
        : "Sold out";

  return (
    <article className="overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(112,72,197,0.14),rgba(39,17,86,0.56))] p-3 shadow-[0_18px_44px_rgba(12,4,36,0.24)] backdrop-blur-sm">
      <div className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))]">
        <Link className="block" href={`/products/${item.slug}`}>
          <div className="relative aspect-[0.93] overflow-hidden bg-[radial-gradient(circle_at_62%_22%,rgba(255,208,239,0.16),transparent_22%),linear-gradient(180deg,rgba(91,55,186,0.56),rgba(31,13,72,0.94))]">
            {item.image ? (
              <Image
                alt={item.image.altText}
                className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                fill
                sizes="(min-width: 1280px) 18vw, (min-width: 768px) 32vw, 100vw"
                src={item.image.url}
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%,rgba(17,7,42,0.2)_100%)]" />
          </div>
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          {item.brand ? (
            <span className="pointer-events-auto rounded-full border border-white/14 bg-[rgba(255,255,255,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_24px_rgba(13,5,37,0.18)] backdrop-blur">
              {item.brand.name}
            </span>
          ) : null}
          <span className="pointer-events-auto rounded-full border border-white/14 bg-[rgba(255,255,255,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_24px_rgba(13,5,37,0.18)] backdrop-blur">
            {statusLabel}
          </span>
        </div>

        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <Link
            aria-label={`Open ${item.title}`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-[rgba(255,255,255,0.12)] text-white shadow-[0_10px_24px_rgba(13,5,37,0.18)] backdrop-blur transition-colors hover:bg-[rgba(255,255,255,0.18)]"
            href={`/products/${item.slug}`}
          >
            <OpenIcon />
          </Link>
          <AddToCartButton
            className="h-10 w-10 rounded-full border border-white/14 bg-[rgba(255,255,255,0.12)] p-0 text-white shadow-[0_10px_24px_rgba(13,5,37,0.18)] backdrop-blur hover:bg-[rgba(255,255,255,0.18)]"
            disabled={!item.availability.inStock}
            label={<CartIcon />}
            listingId={item.listingId}
            pendingLabel={<CartIcon />}
          />
        </div>
      </div>

      <div className="space-y-4 px-1 pb-1 pt-4 text-white">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
            {item.category?.name ?? "Catalog"}
          </p>
          <Link className="block" href={`/products/${item.slug}`}>
            <h3 className="line-clamp-2 font-[var(--font-heading)] text-[1.6rem] font-bold leading-[1.1] tracking-tight text-white">
              {item.title}
            </h3>
          </Link>
          {item.subtitle ? (
            <p className="line-clamp-1 text-sm text-white/58">{item.subtitle}</p>
          ) : null}
        </div>

        <p className="line-clamp-2 text-sm leading-6 text-white/62">
          {item.description}
        </p>

        {item.highlights.length ? (
          <div className="flex flex-wrap gap-2">
            {item.highlights.slice(0, 2).map((highlight) => (
              <span
                className="rounded-full border border-white/8 bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-xs text-white/62"
                key={highlight}
              >
                {highlight}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-3 pt-1">
          <div>
            <p className="text-[1.75rem] font-bold tracking-tight text-white">
              {formatMoney(item.pricing.current)}
            </p>
            {item.pricing.compareAt ? (
              <p className="text-sm text-white/42 line-through">
                {formatMoney(item.pricing.compareAt)}
              </p>
            ) : null}
          </div>

          <div className="text-right text-sm text-white/56">
            <p className="font-semibold text-white/84">{item.seller.name}</p>
            <p>
              {item.availability.inStock
                ? `${item.availability.availableQuantity} available`
                : "Unavailable"}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function OpenIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M8.25 15.75 15.75 8.25m-5.5 0h5.5v5.5M7.75 8.75H7.5A1.75 1.75 0 0 0 5.75 10.5v6A1.75 1.75 0 0 0 7.5 18.25h6a1.75 1.75 0 0 0 1.75-1.75v-.25"
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
