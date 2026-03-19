import Image from "next/image";
import Link from "next/link";

import type { CategorySummary, CategoryTreeNode, ProductListItem } from "@velora/contracts";

import { ApiUnavailablePanel } from "../../components/api-unavailable-panel";
import { ProductCard } from "../../components/product-card";
import { StorefrontChrome } from "../../components/storefront-chrome";
import { getCatalogNavigation, searchCatalog } from "../../lib/storefront-api";

export default async function CategoriesPage(): Promise<React.JSX.Element> {
  const navigation = await getCatalogNavigation();
  const categoryCards = flattenCategoryCards(navigation?.categories ?? []);
  const featuredCategories = (navigation?.featuredCategories ?? []).slice(0, 3);
  const trendingCategory =
    pickTrendingCategory(navigation?.featuredCategories ?? [], navigation?.categories ?? []) ??
    featuredCategories[0] ??
    null;

  const [catalogPreview, trendingResults] = await Promise.all([
    searchCatalog({
      sort: "newest",
      pageSize: "12"
    }),
    trendingCategory
      ? searchCatalog({
          category: trendingCategory.slug,
          sort: "newest",
          pageSize: "3"
        })
      : Promise.resolve(null)
  ]);

  const featuredCards = featuredCategories.map((category) => ({
    ...category,
    image: findCategoryImage(category.slug, catalogPreview?.items ?? [])
  }));

  const allCategoryCards = categoryCards.map((category) => ({
    ...category,
    image: findCategoryImage(category.slug, catalogPreview?.items ?? [])
  }));

  return (
    <StorefrontChrome>
      <div className="overflow-hidden rounded-[40px] border border-white/8 bg-[linear-gradient(180deg,rgba(46,20,104,0.96),rgba(24,10,57,0.98))] shadow-[0_38px_110px_rgba(7,3,24,0.42)]">
        <section className="relative border-b border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12 xl:py-12">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <Image
              alt="Velora categories"
              className="object-cover object-[64%_center]"
              fill
              priority
              sizes="100vw"
              src="/brand/hero-img.png"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(30,11,72,0.94)_0%,rgba(38,16,88,0.82)_34%,rgba(50,23,109,0.54)_58%,rgba(22,9,52,0.42)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(226,147,255,0.16),transparent_22%),radial-gradient(circle_at_86%_14%,rgba(255,203,234,0.16),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_34%)]" />
          </div>

          <div className="relative flex min-h-[520px] items-center xl:min-h-[560px]">
            <div className="max-w-[34rem] space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/56">
                Category discovery
              </p>
              <h1 className="max-w-3xl pb-2 font-[var(--font-heading)] text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl xl:text-[4.6rem] xl:leading-[1.03]">
                <span className="block bg-[linear-gradient(135deg,#ffc8f6_0%,#cf9dff_45%,#f4d0ff_100%)] bg-clip-text text-transparent">
                  Explore Categories
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/70">
                Curated worlds of products, trends, and trusted sellers drawn
                from the same live catalog used across search, product, and
                checkout flows.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                {(navigation?.featuredCategories ?? []).slice(0, 7).map((category) => (
                  <Link
                    className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-2.5 text-sm font-medium text-white/78 transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
                    href={`/categories/${category.slug}`}
                    key={category.slug}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          <SectionHeader
            actionHref="/products"
            actionLabel="Browse catalog"
            actionTone="dark"
            title="Featured Categories"
            titleTone="dark"
          />

          {featuredCards.length ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {featuredCards.map((category) => (
                <Link
                  className="group overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.05)] shadow-[0_18px_44px_rgba(12,4,36,0.22)]"
                  href={`/categories/${category.slug}`}
                  key={category.slug}
                >
                  <div className="relative aspect-[1.12] overflow-hidden bg-[radial-gradient(circle_at_70%_18%,rgba(255,205,235,0.16),transparent_18%),linear-gradient(180deg,rgba(84,49,174,0.7),rgba(31,13,72,0.96))]">
                    {category.image ? (
                      <Image
                        alt={category.image.altText}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        fill
                        sizes="(min-width: 1280px) 28vw, 100vw"
                        src={category.image.url}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_24%,rgba(17,7,42,0.56)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-6 py-5">
                      <div>
                        <h3 className="font-[var(--font-heading)] text-[2rem] font-bold tracking-tight text-white">
                          {category.name}
                        </h3>
                        <p className="mt-2 text-sm text-white/68">
                          {category.productCount} products
                        </p>
                      </div>
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-[rgba(30,12,78,0.78)] text-white shadow-[0_12px_28px_rgba(10,4,30,0.28)] backdrop-blur">
                        <ChevronRightIcon />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <ApiUnavailablePanel
                message="Featured categories come from the live category navigation feed. Start the API and refresh to load them."
                retryHref="/categories"
                retryLabel="Retry categories"
                title="Featured categories are unavailable"
              />
            </div>
          )}
        </section>

        <section className="border-b border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          <SectionHeader
            actionHref="/products"
            actionLabel="View all"
            actionTone="dark"
            title="All Categories"
            titleTone="dark"
          />

          {allCategoryCards.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {allCategoryCards.map((category) => (
                <Link
                  className="group overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-3 shadow-[0_18px_44px_rgba(12,4,36,0.22)] transition-transform hover:-translate-y-1"
                  href={`/categories/${category.slug}`}
                  key={category.slug}
                >
                  <div className="relative aspect-[1.08] overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_68%_18%,rgba(255,205,235,0.16),transparent_18%),linear-gradient(180deg,rgba(84,49,174,0.7),rgba(31,13,72,0.96))]">
                    {category.image ? (
                      <Image
                        alt={category.image.altText}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        fill
                        sizes="(min-width: 1280px) 21vw, (min-width: 640px) 42vw, 100vw"
                        src={category.image.url}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgba(17,7,42,0.54)_100%)]" />
                  </div>

                  <div className="space-y-2 px-1 pb-1 pt-4">
                    <h3 className="font-[var(--font-heading)] text-[1.9rem] font-bold tracking-tight text-white">
                      {category.name}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-6 text-white/64">
                      {category.description}
                    </p>
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <span className="text-sm text-white/72">
                        {category.productCount} items
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-[rgba(30,12,78,0.78)] text-white shadow-[0_12px_28px_rgba(10,4,30,0.28)] backdrop-blur">
                        <ChevronRightIcon />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <ApiUnavailablePanel
              message="The category tree comes from the live API. Start `pnpm dev:api` and refresh to load the seeded marketplace navigation."
              retryHref="/categories"
              retryLabel="Retry categories"
              title="Category navigation is unavailable"
            />
          )}
        </section>

        <section className="px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          <SectionHeader
            actionHref={
              trendingCategory ? `/categories/${trendingCategory.slug}` : "/products?sort=newest"
            }
            actionLabel="View all"
            actionTone="dark"
            title={trendingCategory ? `Trending in ${trendingCategory.name}` : "Trending in catalog"}
            titleTone="dark"
          />

          {trendingResults?.items.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {trendingResults.items.map((item) => (
                <ProductCard item={item} key={item.listingId} />
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <ApiUnavailablePanel
                message="This section should show trending products from a live category branch. The storefront cannot reach the API right now."
                retryHref="/categories"
                retryLabel="Retry category trends"
                title="Trending category products are unavailable"
              />
            </div>
          )}
        </section>
      </div>
    </StorefrontChrome>
  );
}

function SectionHeader({
  title,
  actionLabel,
  actionHref,
  titleTone,
  actionTone
}: {
  title: string;
  actionLabel: string;
  actionHref: string;
  titleTone: "dark" | "light";
  actionTone: "dark" | "light";
}): React.JSX.Element {
  const titleClass =
    titleTone === "light" ? "text-[var(--foreground)]" : "text-white";
  const actionClass =
    actionTone === "light"
      ? "inline-flex items-center justify-center rounded-full border border-[rgba(78,47,167,0.12)] bg-white/82 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] shadow-[0_12px_28px_rgba(29,12,70,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
      : "inline-flex items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-all hover:-translate-y-0.5 hover:border-white/22 hover:bg-[rgba(255,255,255,0.11)]";

  return (
    <div className="flex items-center justify-between gap-4">
      <h2
        className={`font-[var(--font-heading)] text-[2.35rem] font-bold tracking-tight ${titleClass}`}
      >
        {title}
      </h2>
      <Link className={actionClass} href={actionHref}>
        {actionLabel}
      </Link>
    </div>
  );
}

function flattenCategoryCards(categories: CategoryTreeNode[]): CategorySummary[] {
  return categories.flatMap((category) => [
    {
      slug: category.slug,
      name: category.name,
      description: category.description,
      productCount: category.productCount
    },
    ...category.children
  ]);
}

function findCategoryImage(
  slug: string,
  items: ProductListItem[]
): ProductListItem["image"] {
  return (
    items.find(
      (item) =>
        item.category?.slug === slug ||
        item.category?.path.some((crumb) => crumb.slug === slug)
    )?.image ?? null
  );
}

function pickTrendingCategory(
  featured: CategorySummary[],
  roots: CategoryTreeNode[]
): CategorySummary | null {
  const preferred = [...featured, ...roots].find((category) =>
    /(tech|electronic|gadget|phone|audio|fitness)/i.test(category.name)
  );

  return preferred ?? featured[0] ?? roots[0] ?? null;
}

function ChevronRightIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 24 24"
      width="16"
    >
      <path
        d="m9.75 7.75 4.5 4.25-4.5 4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
