import Image from "next/image";
import Link from "next/link";

import type { ProductListItem } from "@velora/contracts";
import { Badge, Panel } from "@velora/ui";

import { formatMoney } from "../lib/formatting";

export function ProductCard({
  item
}: {
  item: ProductListItem;
}): React.JSX.Element {
  return (
    <Link className="block h-full" href={`/products/${item.slug}`}>
      <Panel className="flex h-full flex-col gap-4 transition-transform duration-200 hover:-translate-y-1">
        <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,rgba(248,246,241,0.96),rgba(233,238,243,0.96))] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              {item.brand ? <Badge>{item.brand.name}</Badge> : null}
              {!item.availability.inStock ? (
                <Badge className="border-[rgba(215,38,56,0.2)] bg-[rgba(215,38,56,0.08)] text-[var(--accent)]">
                  Out of stock
                </Badge>
              ) : null}
            </div>
            {item.pricing.discountPercentage ? (
              <span className="rounded-full bg-[rgba(16,32,47,0.08)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                -{item.pricing.discountPercentage}%
              </span>
            ) : null}
          </div>
          <div className="mt-6 flex aspect-square items-center justify-center rounded-[20px] bg-white/80 p-4">
            {item.image ? (
              <Image
                alt={item.image.altText}
                className="h-full w-full object-contain"
                height={480}
                src={item.image.url}
                width={480}
              />
            ) : (
              <div className="text-sm text-[var(--muted)]">No image</div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              {item.category?.name ?? "Catalog"}
            </p>
            <h3 className="mt-2 font-[var(--font-heading)] text-2xl font-bold tracking-tight">
              {item.title}
            </h3>
            {item.subtitle ? (
              <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                {item.subtitle}
              </p>
            ) : null}
          </div>
          <p className="line-clamp-3 text-sm leading-7 text-[var(--muted)]">
            {item.description}
          </p>
        </div>

        <div className="grid gap-2 text-sm text-[var(--muted)]">
          {item.highlights.slice(0, 3).map((highlight) => (
            <div key={highlight} className="rounded-2xl bg-black/3 px-3 py-2">
              {highlight}
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-2">
          <div>
            <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {formatMoney(item.pricing.current)}
            </p>
            {item.pricing.compareAt ? (
              <p className="text-sm text-[var(--muted)] line-through">
                {formatMoney(item.pricing.compareAt)}
              </p>
            ) : null}
          </div>
          <div className="text-right text-sm text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">
              {item.seller.name}
            </p>
            <p>
              {item.availability.inStock
                ? `${item.availability.availableQuantity} ready to ship`
                : "Unavailable"}
            </p>
          </div>
        </div>
      </Panel>
    </Link>
  );
}
