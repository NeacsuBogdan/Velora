import Link from "next/link";

import { Badge, Panel } from "@velora/ui";

import { ProductCard } from "../../components/product-card";
import { StorefrontChrome } from "../../components/storefront-chrome";
import {
  getCatalogNavigation,
  searchCatalog
} from "../../lib/storefront-api";

export default async function CategoriesPage(): Promise<React.JSX.Element> {
  const [navigation, featuredProducts] = await Promise.all([
    getCatalogNavigation(),
    searchCatalog({
      sort: "newest",
      pageSize: "6"
    })
  ]);

  return (
    <StorefrontChrome>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Panel className="space-y-4">
          <Badge>Category navigation</Badge>
          <div>
            <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
              Browse the catalog from a category tree, not a placeholder shell.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Stage 3 moves the storefront into real browsing territory with
              seeded category depth, search-driven discovery, and product detail
              pages that reflect live API data.
            </p>
          </div>
        </Panel>

        <Panel className="space-y-4 bg-[linear-gradient(160deg,rgba(16,32,47,0.96),rgba(40,58,77,0.96))] text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
            Featured categories
          </p>
          <div className="grid gap-3">
            {navigation?.featuredCategories.map((category) => (
              <Link
                key={category.slug}
                className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 transition-colors hover:bg-white/12"
                href={`/categories/${category.slug}`}
              >
                <p className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
                  {category.name}
                </p>
                <p className="mt-2 text-sm text-white/70">
                  {category.description}
                </p>
                <p className="mt-3 text-sm font-semibold text-white/90">
                  {category.productCount} active products
                </p>
              </Link>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {navigation?.categories.map((category) => (
          <Panel key={category.slug} className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Root category
              </p>
              <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                <Link href={`/categories/${category.slug}`}>{category.name}</Link>
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {category.description}
              </p>
            </div>
            <div className="grid gap-3">
              {category.children.map((child) => (
                <Link
                  key={child.slug}
                  className="rounded-[22px] bg-black/3 px-4 py-3 transition-colors hover:bg-black/6"
                  href={`/categories/${child.slug}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{child.name}</span>
                    <span className="text-sm text-[var(--muted)]">
                      {child.productCount}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {child.description}
                  </p>
                </Link>
              ))}
            </div>
          </Panel>
        ))}
      </section>

      <section className="space-y-5 pb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              New in catalog
            </p>
            <h2 className="mt-2 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              Recently indexed products
            </h2>
          </div>
          <Link
            className="text-sm font-semibold text-[var(--foreground)]"
            href="/products?sort=newest"
          >
            View all products
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
