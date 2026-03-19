import Link from "next/link";

import type { CatalogSearchResponse } from "@velora/contracts";

import {
  getQueryValue,
  getQueryValues,
  type CatalogQueryInput
} from "../lib/catalog-query";
import { ApiUnavailablePanel } from "./api-unavailable-panel";
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

const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" }
] as const;

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
  const selectedCategory = getQueryValue(searchParams, "category");
  const availability = getQueryValue(searchParams, "availability") || "all";
  const sort = getQueryValue(searchParams, "sort") || "relevance";
  const featureChips = buildFeatureChips(results);
  const resultCount = results?.pagination.totalItems ?? 0;
  const appliedPills = buildAppliedPills({
    query,
    selectedBrands,
    selectedCategory,
    availability,
    results
  });

  return (
    <form action={action}>
      {lockCategory && selectedCategory ? (
        <input name="category" type="hidden" value={selectedCategory} />
      ) : null}

      <div className="overflow-hidden rounded-[40px] border border-white/8 bg-[linear-gradient(180deg,rgba(46,20,104,0.96),rgba(24,10,57,0.98))] shadow-[0_38px_110px_rgba(7,3,24,0.42)]">
        <section className="relative border-b border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(226,147,255,0.16),transparent_22%),radial-gradient(circle_at_86%_14%,rgba(255,203,234,0.16),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_34%)]" />

          <div className="relative space-y-7">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/56">
                {eyebrow}
              </p>
              <h1 className="max-w-4xl font-[var(--font-heading)] text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-3xl text-base leading-8 text-white/70">
                {description}
              </p>
            </div>

            <div className="flex min-w-0 items-center gap-3 rounded-full bg-white px-3 py-3 text-[var(--foreground)] shadow-[0_24px_60px_rgba(17,7,43,0.3)]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(108,78,212,0.12)] text-[var(--accent-dark)]">
                <SearchIcon />
              </span>
              <input
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--muted)]"
                defaultValue={query}
                name="q"
                placeholder="Search for products..."
                type="search"
              />
              <button
                aria-label="Search"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-white transition-colors hover:bg-[rgba(35,21,79,0.92)]"
                type="submit"
              >
                <SearchIcon />
              </button>
            </div>

            {featureChips.length ? (
              <div className="flex flex-wrap gap-2">
                {featureChips.map((chip) => (
                  <span
                    className="rounded-[14px] border border-white/10 bg-[rgba(24,10,57,0.44)] px-4 py-2 text-sm text-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    key={chip}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(62,31,140,0.28),rgba(29,13,68,0.88))] px-6 py-7 text-white lg:border-b-0 lg:border-r lg:border-white/10 lg:px-7 xl:px-8">
            <div className="lg:sticky lg:top-8">
              <div className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
                      Filters
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      Narrow the marketplace catalog with real query filters.
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] text-white/82">
                    <FilterIcon />
                  </div>
                </div>

                <div className="space-y-6">
                  <FilterGroup title="Sort">
                    <select
                      className={fieldClassName}
                      defaultValue={sort}
                      name="sort"
                    >
                      {(results?.availableSorts ?? sortOptions).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FilterGroup>

                  <FilterGroup title="Price range">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <input
                        className={fieldClassName}
                        defaultValue={minPrice}
                        name="minPrice"
                        placeholder="Min price"
                        type="number"
                      />
                      <input
                        className={fieldClassName}
                        defaultValue={maxPrice}
                        name="maxPrice"
                        placeholder="Max price"
                        type="number"
                      />
                    </div>
                  </FilterGroup>

                  <FilterGroup title="Availability">
                    <div className="grid gap-2">
                      <FilterRadio
                        checked={availability === "all"}
                        label="All products"
                        value="all"
                      />
                      <FilterRadio
                        checked={availability === "in_stock"}
                        label="In stock only"
                        value="in_stock"
                      />
                    </div>
                  </FilterGroup>

                  {results?.facets.brands.length ? (
                    <FilterGroup title="Brands">
                      <div className="grid gap-2">
                        {results.facets.brands.map((brand) => (
                          <FilterCheckboxRow
                            checked={selectedBrands.includes(brand.value)}
                            count={brand.count}
                            key={brand.value}
                            label={brand.label}
                            name="brand"
                            value={brand.value}
                          />
                        ))}
                      </div>
                    </FilterGroup>
                  ) : null}

                  {!lockCategory && results?.facets.categories.length ? (
                    <FilterGroup title="Categories">
                      <div className="grid gap-2">
                        {results.facets.categories.map((category) => (
                          <FilterCategoryRow
                            checked={selectedCategory === category.value}
                            count={category.count}
                            key={category.value}
                            label={category.label}
                            value={category.value}
                          />
                        ))}
                      </div>
                    </FilterGroup>
                  ) : null}

                  <div className="grid gap-3 pt-2">
                    <button
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 bg-[linear-gradient(135deg,rgba(124,88,255,0.92),rgba(85,48,196,0.98))] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(19,9,52,0.3)] transition-all hover:-translate-y-0.5"
                      type="submit"
                    >
                      Apply filters
                    </button>
                    <Link
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-5 py-3 text-sm font-semibold text-white/82 transition-all hover:-translate-y-0.5 hover:border-white/22 hover:bg-[rgba(255,255,255,0.1)]"
                      href={action}
                    >
                      Reset filters
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="bg-[linear-gradient(180deg,rgba(49,21,110,0.42),rgba(23,10,53,0.92))] px-6 py-7 text-white sm:px-8 lg:px-8 xl:px-10">
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-white/56">
                    Source: {results?.source ?? "unavailable"}
                  </p>
                  <p className="font-[var(--font-heading)] text-4xl font-bold tracking-tight text-white">
                    {resultCount} result{resultCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {appliedPills.map((pill) => (
                    <span
                      className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/76"
                      key={pill}
                    >
                      {pill}
                    </span>
                  ))}
                  <div className="hidden items-center gap-2 lg:flex">
                    <ToolbarIcon active icon={<GridIcon />} />
                    <ToolbarIcon icon={<RowsIcon />} />
                    <ToolbarIcon icon={<SortIcon />} />
                  </div>
                </div>
              </div>

              {results === null ? (
                <ApiUnavailablePanel
                  message="The storefront could not reach the Velora API for this catalog view. Start `pnpm dev:api`, confirm `NEXT_PUBLIC_API_URL` points to the running backend, and refresh."
                  retryHref={action}
                  retryLabel="Retry this view"
                  title="Catalog data is unavailable"
                />
              ) : results.items.length ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {results.items.map((item) => (
                    <ProductCard key={item.listingId} item={item} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-6 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight text-white">
                    No products match the current filters.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/64">
                    Adjust price, brand, category, or availability filters to
                    widen the result set.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}

function FilterGroup({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/76">
        {title}
      </p>
      {children}
    </div>
  );
}

function FilterCheckboxRow({
  checked,
  label,
  value,
  count,
  name
}: {
  checked: boolean;
  label: string;
  value: string;
  count: number;
  name: string;
}): React.JSX.Element {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white/74 transition-colors hover:bg-[rgba(255,255,255,0.08)]">
      <span className="flex min-w-0 items-center gap-3">
        <input
          defaultChecked={checked}
          name={name}
          type="checkbox"
          value={value}
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-white/48">{count}</span>
    </label>
  );
}

function FilterCategoryRow({
  checked,
  label,
  value,
  count
}: {
  checked: boolean;
  label: string;
  value: string;
  count: number;
}): React.JSX.Element {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white/74 transition-colors hover:bg-[rgba(255,255,255,0.08)]">
      <span className="flex min-w-0 items-center gap-3">
        <input
          defaultChecked={checked}
          name="category"
          type="radio"
          value={value}
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-white/48">{count}</span>
    </label>
  );
}

function FilterRadio({
  checked,
  label,
  value
}: {
  checked: boolean;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <label className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white/74 transition-colors hover:bg-[rgba(255,255,255,0.08)]">
      <input
        defaultChecked={checked}
        name="availability"
        type="radio"
        value={value}
      />
      <span>{label}</span>
    </label>
  );
}

function ToolbarIcon({
  icon,
  active = false
}: {
  icon: React.ReactNode;
  active?: boolean;
}): React.JSX.Element {
  return (
    <span
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
        active
          ? "border-white/20 bg-[rgba(255,255,255,0.12)] text-white"
          : "border-white/10 bg-[rgba(255,255,255,0.05)] text-white/68"
      }`}
    >
      {icon}
    </span>
  );
}

function buildFeatureChips(results: CatalogSearchResponse | null): string[] {
  if (!results) {
    return [];
  }

  const categories = results.facets.categories.slice(0, 3).map((item) => item.label);
  const brands = results.facets.brands.slice(0, 2).map((item) => item.label);

  return [...categories, ...brands];
}

function buildAppliedPills({
  query,
  selectedBrands,
  selectedCategory,
  availability,
  results
}: {
  query: string;
  selectedBrands: string[];
  selectedCategory: string;
  availability: string;
  results: CatalogSearchResponse | null;
}): string[] {
  const pills: string[] = [];

  if (query) {
    pills.push(`Query: ${query}`);
  }

  if (selectedCategory) {
    const categoryLabel =
      results?.facets.categories.find((item) => item.value === selectedCategory)
        ?.label ?? "Category";
    pills.push(categoryLabel);
  }

  if (selectedBrands.length) {
    pills.push(
      selectedBrands.length === 1
        ? `Brand: ${selectedBrands[0]}`
        : `${selectedBrands.length} brands`
    );
  }

  if (availability === "in_stock") {
    pills.push("In stock");
  }

  return pills;
}

const fieldClassName =
  "w-full rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/38 focus:border-white/20";

function SearchIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
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

function FilterIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M4.75 6.75h14.5M7.75 12h8.5m-5 5.25h2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function GridIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M5.25 5.25h5.5v5.5h-5.5zm8 0h5.5v5.5h-5.5zm-8 8h5.5v5.5h-5.5zm8 0h5.5v5.5h-5.5z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function RowsIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M5.25 7.25h13.5M5.25 12h13.5M5.25 16.75h13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SortIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M7.75 6.25h8.5M6.25 12h11.5m-8.5 5.75h5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
