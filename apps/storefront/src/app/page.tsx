import Link from "next/link";

import { Badge, Panel, StatTile } from "@velora/ui";

import { OverviewPanel } from "../components/overview-panel";
import { ProductCard } from "../components/product-card";
import { StorefrontChrome } from "../components/storefront-chrome";
import {
  getCatalogNavigation,
  getDomainOverview,
  searchCatalog
} from "../lib/storefront-api";

const primaryLinkClass =
  "inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(215,38,56,0.25)] transition-colors hover:bg-[var(--accent-dark)]";

const secondaryLinkClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";

export default async function HomePage(): Promise<React.JSX.Element> {
  const [catalogOverview, promotionOverview, navigation, featuredProducts] =
    await Promise.all([
      getDomainOverview("/catalog/overview"),
      getDomainOverview("/promotions/overview"),
      getCatalogNavigation(),
      searchCatalog({
        sort: "newest",
        pageSize: "3"
      })
    ]);

  return (
    <StorefrontChrome>
      <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:items-center">
        <div className="space-y-6">
          <Badge>Production-style marketplace MVP</Badge>
          <div className="space-y-5">
            <h1 className="max-w-3xl font-[var(--font-heading)] text-5xl font-extrabold tracking-tight text-[var(--foreground)] md:text-6xl">
              Browse a seeded marketplace that already thinks in catalog depth,
              search projections, and operational clarity.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Stage 3 turns Velora into a real browsing product with category
              hierarchy, product listings, detail pages, and a dedicated search
              surface backed by a projection-ready API.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={primaryLinkClass} href="/products">
              Browse products
            </Link>
            <Link className={secondaryLinkClass} href="/search">
              Search catalog
            </Link>
          </div>
        </div>

        <Panel className="overflow-hidden bg-[linear-gradient(160deg,rgba(16,32,47,0.96),rgba(40,58,77,0.96))] text-white">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              Marketplace snapshot
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatTile
                className="border-white/10 bg-white/8 text-white"
                label="Catalog"
                value={(catalogOverview?.metrics.products ?? 0).toString()}
                detail="Products currently visible in the seeded API catalog."
              />
              <StatTile
                className="border-white/10 bg-white/8 text-white"
                label="Promotions"
                value={(promotionOverview?.metrics.activePromotions ?? 0).toString()}
                detail="Active price incentives wired into the API layer."
              />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
              <p className="text-sm font-semibold text-white/90">
                Live category depth
              </p>
              <ul className="mt-3 grid gap-2 text-sm text-white/70">
                {(navigation?.featuredCategories ?? []).map((item) => (
                  <li key={item.slug}>
                    {item.name} · {item.productCount} products
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <OverviewPanel
          title="Catalog snapshot"
          eyebrow="Live API feed"
          overview={catalogOverview}
          emptyCopy="The catalog service is unavailable. Start the API to see the live seeded categories and counts."
        />
        <OverviewPanel
          title="Promotion snapshot"
          eyebrow="Pricing surface"
          overview={promotionOverview}
          emptyCopy="Promotion metrics will appear here once the API responds."
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {navigation?.categories.map((category) => (
          <Link key={category.slug} href={`/categories/${category.slug}`}>
            <Panel className="h-full transition-transform duration-200 hover:-translate-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Root category
              </p>
              <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                {category.name}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {category.description}
              </p>
              <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">
                {category.productCount} products
              </p>
            </Panel>
          </Link>
        ))}
      </section>

      <section className="space-y-5 pb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Recently indexed
            </p>
            <h2 className="mt-2 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              Product spotlight
            </h2>
          </div>
          <Link className="text-sm font-semibold" href="/products?sort=newest">
            View all
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featuredProducts?.items.map((item) => (
            <ProductCard key={item.listingId} item={item} />
          ))}
        </div>
      </section>
    </StorefrontChrome>
  );
}
