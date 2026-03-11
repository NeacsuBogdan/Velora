import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@velora/ui";

import { CatalogBrowser } from "../../../components/catalog-browser";
import { StorefrontChrome } from "../../../components/storefront-chrome";
import {
  getCategoryDetail,
  searchCatalog
} from "../../../lib/storefront-api";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CategoryDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const [category, results] = await Promise.all([
    getCategoryDetail(slug),
    searchCatalog({
      ...resolvedSearchParams,
      category: slug
    })
  ]);

  if (!category) {
    notFound();
  }

  return (
    <StorefrontChrome>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <Link href="/categories">Categories</Link>
          {category.breadcrumbs.map((crumb) => (
            <span key={crumb.slug}>/ {crumb.name}</span>
          ))}
        </div>
        <Panel className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
              {category.name}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              {category.description}
            </p>
          </div>
          <div className="grid gap-3 rounded-[24px] bg-black/4 p-4 text-sm">
            <div>
              <p className="text-[var(--muted)]">Products</p>
              <p className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                {category.metrics.products}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Brands</p>
              <p className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                {category.metrics.brands}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Sellers</p>
              <p className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                {category.metrics.sellers}
              </p>
            </div>
          </div>
        </Panel>
      </section>

      {category.childCategories.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {category.childCategories.map((child) => (
            <Link key={child.slug} href={`/categories/${child.slug}`}>
              <Panel className="h-full transition-transform duration-200 hover:-translate-y-1">
                <p className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
                  {child.name}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {child.description}
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">
                  {child.productCount} products
                </p>
              </Panel>
            </Link>
          ))}
        </section>
      ) : null}

      <CatalogBrowser
        action={`/categories/${slug}`}
        description="Filter the active listings within this category branch."
        eyebrow="Category listing"
        lockCategory
        results={results}
        searchParams={{ ...resolvedSearchParams, category: slug }}
        title={`Products in ${category.name}`}
      />
    </StorefrontChrome>
  );
}
