import Link from "next/link";

import type { CatalogSearchResponse } from "@velora/contracts";
import { Badge, Panel } from "@velora/ui";

import {
  getQueryValue,
  getQueryValues,
  type CatalogQueryInput
} from "../lib/catalog-query";
import { ProductCard } from "./product-card";

interface CatalogBrowserProps {
  action: string;
  eyebrow: string;
  title: string;
  description: string;
  results: CatalogSearchResponse | null;
  searchParams: CatalogQueryInput;
  lockCategory?: boolean;
}

export function CatalogBrowser({
  action,
  eyebrow,
  title,
  description,
  results,
  searchParams,
  lockCategory = false
}: CatalogBrowserProps): React.JSX.Element {
  const selectedBrands = getQueryValues(searchParams, "brand");
  const query = getQueryValue(searchParams, "q");
  const minPrice = getQueryValue(searchParams, "minPrice");
  const maxPrice = getQueryValue(searchParams, "maxPrice");
  const availability = getQueryValue(searchParams, "availability") || "all";
  const sort = getQueryValue(searchParams, "sort") || "relevance";

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <Panel className="space-y-5">
          <div>
            <Badge>{eyebrow}</Badge>
            <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {description}
            </p>
          </div>

          <form action={action} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="catalog-q">
                Search terms
              </label>
              <input
                className="w-full rounded-2xl border border-[var(--stroke)] bg-[rgba(244,244,241,0.8)] px-4 py-3 text-sm outline-none"
                defaultValue={query}
                id="catalog-q"
                name="q"
                placeholder="Search the catalog"
                type="search"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="catalog-sort">
                Sort
              </label>
              <select
                className="w-full rounded-2xl border border-[var(--stroke)] bg-[rgba(244,244,241,0.8)] px-4 py-3 text-sm outline-none"
                defaultValue={sort}
                id="catalog-sort"
                name="sort"
              >
                {(results?.availableSorts ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="catalog-min-price">
                  Min price
                </label>
                <input
                  className="w-full rounded-2xl border border-[var(--stroke)] bg-[rgba(244,244,241,0.8)] px-4 py-3 text-sm outline-none"
                  defaultValue={minPrice}
                  id="catalog-min-price"
                  name="minPrice"
                  placeholder="0"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="catalog-max-price">
                  Max price
                </label>
                <input
                  className="w-full rounded-2xl border border-[var(--stroke)] bg-[rgba(244,244,241,0.8)] px-4 py-3 text-sm outline-none"
                  defaultValue={maxPrice}
                  id="catalog-max-price"
                  name="maxPrice"
                  placeholder="10000"
                  type="number"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Availability</p>
              <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <input
                  defaultChecked={availability === "all"}
                  name="availability"
                  type="radio"
                  value="all"
                />
                All products
              </label>
              <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <input
                  defaultChecked={availability === "in_stock"}
                  name="availability"
                  type="radio"
                  value="in_stock"
                />
                In stock only
              </label>
            </div>

            {results?.facets.brands.length ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Brands</p>
                <div className="grid gap-2">
                  {results.facets.brands.map((brand) => (
                    <label
                      key={brand.value}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-black/3 px-3 py-2 text-sm text-[var(--muted)]"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          defaultChecked={selectedBrands.includes(brand.value)}
                          name="brand"
                          type="checkbox"
                          value={brand.value}
                        />
                        {brand.label}
                      </span>
                      <span>{brand.count}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {!lockCategory && results?.facets.categories.length ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Categories</p>
                <div className="grid gap-2">
                  {results.facets.categories.map((category) => (
                    <label
                      key={category.value}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-black/3 px-3 py-2 text-sm text-[var(--muted)]"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          defaultChecked={
                            getQueryValue(searchParams, "category") === category.value
                          }
                          name="category"
                          type="radio"
                          value={category.value}
                        />
                        {category.label}
                      </span>
                      <span>{category.count}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                type="submit"
              >
                Apply filters
              </button>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] px-5 py-3 text-sm font-semibold"
                href={action}
              >
                Reset
              </Link>
            </div>
          </form>
        </Panel>
      </aside>

      <section className="space-y-5">
        <Panel className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-[var(--muted)]">
              Source: {results?.source ?? "unavailable"}
            </p>
            <p className="mt-1 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
              {results?.pagination.totalItems ?? 0} results
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-[var(--muted)]">
            {results?.query ? (
              <span className="rounded-full bg-black/5 px-3 py-2">
                Query: {results.query}
              </span>
            ) : null}
            {results?.appliedFilters.category ? (
              <span className="rounded-full bg-black/5 px-3 py-2">
                Category locked
              </span>
            ) : null}
            {results?.appliedFilters.brands.length ? (
              <span className="rounded-full bg-black/5 px-3 py-2">
                {results.appliedFilters.brands.length} brand filters
              </span>
            ) : null}
          </div>
        </Panel>

        {results?.items.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {results.items.map((item) => (
              <ProductCard key={item.listingId} item={item} />
            ))}
          </div>
        ) : (
          <Panel className="text-center">
            <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
              No products match the current filters.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Adjust price, brand, or availability filters to widen the result
              set.
            </p>
          </Panel>
        )}
      </section>
    </div>
  );
}
