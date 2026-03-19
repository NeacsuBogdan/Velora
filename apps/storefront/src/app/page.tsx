import Image from "next/image";
import Link from "next/link";

import type { CategorySummary, ProductListItem } from "@velora/contracts";

import { ApiUnavailablePanel } from "../components/api-unavailable-panel";
import { StorefrontChrome } from "../components/storefront-chrome";
import { formatMoney } from "../lib/formatting";
import {
  getCatalogNavigation,
  getDomainOverview,
  searchCatalog
} from "../lib/storefront-api";

const heroButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 bg-[rgba(255,255,255,0.05)] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/24 hover:bg-[rgba(255,255,255,0.1)]";

const primaryHeroButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-white/16 bg-[linear-gradient(135deg,rgba(124,88,255,0.92),rgba(85,48,196,0.98))] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(19,9,52,0.3)] transition-all hover:-translate-y-0.5";

const darkActionClass =
  "inline-flex items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-all hover:-translate-y-0.5 hover:border-white/22 hover:bg-[rgba(255,255,255,0.11)]";

const lightActionClass =
  "inline-flex items-center justify-center rounded-full border border-[rgba(78,47,167,0.12)] bg-white/82 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] shadow-[0_12px_28px_rgba(29,12,70,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white";

const highlightChips = [
  "Trending now",
  "Handmade crafts",
  "Tech gadgets"
] as const;

const valueItems = [
  {
    icon: "CM",
    title: "Curated marketplace",
    description:
      "Browse a premium multi-seller catalog with live product, offer, and pricing data instead of a static showcase shell."
  },
  {
    icon: "SP",
    title: "Secure payments",
    description:
      "Checkout, payment attempts, and order state transitions are already wired through production-style marketplace flows."
  },
  {
    icon: "FS",
    title: "Fast shipping",
    description:
      "Seller operations, stock posture, and fulfillment updates stay connected to the same customer-visible commerce state."
  }
] as const;

type SellerSpotlight = {
  slug: string;
  name: string;
  heroImage: ProductListItem["image"];
  gallery: Array<ProductListItem["image"]>;
  categories: string[];
};

export default async function HomePage(): Promise<React.JSX.Element> {
  const [catalogOverview, promotionOverview, navigation, featuredProducts] =
    await Promise.all([
      getDomainOverview("/catalog/overview"),
      getDomainOverview("/promotions/overview"),
      getCatalogNavigation(),
      searchCatalog({
        sort: "newest",
        pageSize: "9"
      })
    ]);

  const categoryCards = buildCategoryCards(
    navigation?.featuredCategories.slice(0, 3) ?? [],
    featuredProducts?.items ?? []
  );
  const trendingProducts = featuredProducts?.items.slice(0, 3) ?? [];
  const sellerSpotlights = buildSellerSpotlights(featuredProducts?.items ?? []);

  return (
    <StorefrontChrome>
      <div className="overflow-hidden rounded-[40px] border border-white/8 bg-[linear-gradient(180deg,rgba(46,20,104,0.96),rgba(24,10,57,0.98))] shadow-[0_40px_120px_rgba(7,3,24,0.44)]">
        <section className="relative border-b border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12 xl:py-12">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <Image
              alt="Velora hero"
              className="object-cover object-[62%_center]"
              fill
              priority
              sizes="100vw"
              src="/brand/hero-img.png"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(30,11,72,0.94)_0%,rgba(38,16,88,0.82)_32%,rgba(50,23,109,0.54)_58%,rgba(22,9,52,0.42)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(226,147,255,0.18),transparent_20%),radial-gradient(circle_at_82%_6%,rgba(255,203,234,0.18),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_32%)]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.04))]" />
          </div>

          <div className="relative flex min-h-[560px] items-center xl:min-h-[620px]">
            <div className="z-10 max-w-[34rem] space-y-7 xl:pl-2">
              <div className="space-y-4">
                <h1 className="max-w-2xl font-[var(--font-heading)] text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl xl:text-[5rem] xl:leading-[1.02]">
                  <span className="block text-white">Discover &amp; Shop</span>
                  <span className="block bg-[linear-gradient(135deg,#ffc8f6_0%,#cf9dff_45%,#f4d0ff_100%)] bg-clip-text text-transparent">
                    Unique Products
                  </span>
                </h1>
                <p className="max-w-xl text-lg leading-8 text-white/72">
                  Explore the best collections from independent sellers.
                </p>
              </div>

              <form
                action="/search"
                className="flex min-w-0 items-center gap-3 rounded-full bg-white px-5 py-3 text-[var(--foreground)] shadow-[0_24px_60px_rgba(17,7,43,0.32)]"
              >
                <input
                  aria-label="Search products"
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--muted)]"
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
              </form>

              <div className="flex flex-wrap gap-3">
                <Link className={heroButtonClass} href="/categories">
                  Browse Categories
                  <ChevronRightIcon />
                </Link>
                <Link className={heroButtonClass} href="/become-a-seller">
                  Sell on Velora
                  <ChevronRightIcon />
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {highlightChips.map((chip) => (
                  <span
                    className="rounded-[14px] border border-white/10 bg-[rgba(24,10,57,0.46)] px-4 py-2 text-sm text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    key={chip}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <p className="max-w-2xl text-sm leading-7 text-white/56">
                {(catalogOverview?.metrics.products ?? 0).toLocaleString()} live
                products,{" "}
                {(promotionOverview?.metrics.activePromotions ?? 0).toLocaleString()}{" "}
                active campaigns, and a seeded multi-seller catalog already wired
                into the platform.
              </p>
            </div>
          </div>
        </section>

        <div className="grid xl:grid-cols-2">
          <section className="border-b border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:border-r xl:px-12">
            <SectionHeader
              actionHref="/categories"
              actionLabel="View all"
              actionTone="dark"
              title="Featured Collections"
              titleTone="dark"
            />

            {categoryCards.length ? (
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {categoryCards.map((category) => (
                  <Link
                    className="group overflow-hidden rounded-[20px] bg-[rgba(255,255,255,0.05)] shadow-[0_14px_40px_rgba(13,5,37,0.18)]"
                    href={`/categories/${category.slug}`}
                    key={category.slug}
                  >
                    <div className="relative aspect-[0.84] overflow-hidden">
                      {category.image ? (
                        <Image
                          alt={category.image.altText}
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          fill
                          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 32vw, 100vw"
                          src={category.image.url}
                        />
                      ) : (
                        <div className="h-full w-full bg-[linear-gradient(180deg,rgba(155,120,255,0.54),rgba(65,33,142,0.9))]" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(24,10,57,0.92))] px-5 pb-5 pt-12">
                        <h3 className="font-[var(--font-heading)] text-[1.85rem] font-bold tracking-tight text-white">
                          {category.name}
                        </h3>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white/72">
                          <span>{category.productCount} products</span>
                          <ChevronRightIcon />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-8">
                <ApiUnavailablePanel
                  message="The category feed is not available right now. Start the API and refresh to load the live marketplace tree."
                  retryHref="/"
                  retryLabel="Retry home"
                  title="Featured categories are unavailable"
                />
              </div>
            )}
          </section>

          <section
            className="border-b border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12"
            id="trending"
          >
            <SectionHeader
              actionHref="/products?sort=newest"
              actionLabel="See all"
              actionTone="dark"
              title="Trending Products"
              titleTone="dark"
            />

            {trendingProducts.length ? (
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {trendingProducts.map((item) => (
                  <Link
                    className="overflow-hidden rounded-[18px] bg-white text-[var(--foreground)] shadow-[0_18px_44px_rgba(15,6,40,0.18)] transition-transform hover:-translate-y-1"
                    href={`/products/${item.slug}`}
                    key={item.listingId}
                  >
                    <div className="relative aspect-[0.92] overflow-hidden bg-[linear-gradient(180deg,rgba(53,27,117,0.88),rgba(26,11,61,0.98))]">
                      {item.image ? (
                        <Image
                          alt={item.image.altText}
                          className="object-cover"
                          fill
                          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 32vw, 100vw"
                          src={item.image.url}
                        />
                      ) : null}
                    </div>
                    <div className="space-y-3 px-4 py-4">
                      <h3 className="line-clamp-2 min-h-[3.4rem] text-lg font-semibold leading-7">
                        {item.title}
                      </h3>
                      <StarsRow />
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                            {formatMoney(item.pricing.current)}
                          </p>
                          {item.pricing.compareAt ? (
                            <p className="text-sm text-[var(--muted)] line-through">
                              {formatMoney(item.pricing.compareAt)}
                            </p>
                          ) : null}
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                          RON
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-8">
                <ApiUnavailablePanel
                  message="The storefront could not load the trending product feed from the API."
                  retryHref="/"
                  retryLabel="Retry home"
                  title="Trending products are unavailable"
                />
              </div>
            )}
          </section>

          <section
            className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,239,255,0.94))] px-6 py-8 text-[var(--foreground)] sm:px-8 lg:px-10 lg:py-10 xl:border-r xl:border-white/10 xl:px-12"
            id="about"
          >
            <SectionHeader
              actionHref="/become-a-seller"
              actionLabel="See all"
              actionTone="light"
              title="Best Sellers"
              titleTone="light"
            />

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {sellerSpotlights.map((seller) => (
                <div
                  className="overflow-hidden rounded-[20px] bg-white shadow-[0_18px_44px_rgba(34,16,78,0.1)]"
                  key={seller.slug}
                >
                  <div className="relative aspect-[1.05] overflow-hidden bg-[linear-gradient(180deg,rgba(68,39,146,0.84),rgba(236,228,255,0.22))]">
                    {seller.heroImage ? (
                      <Image
                        alt={`${seller.name} cover`}
                        className="object-cover"
                        fill
                        sizes="(min-width: 1280px) 20vw, (min-width: 768px) 32vw, 100vw"
                        src={seller.heroImage.url}
                      />
                    ) : null}
                  </div>
                  <div className="space-y-4 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-[var(--font-heading)] text-[1.8rem] font-bold tracking-tight">
                        {seller.name}
                      </h3>
                      <span className="rounded-full bg-[rgba(143,107,255,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-dark)]">
                        Seller
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-[var(--muted)]">
                      Category footprint: {seller.categories.join(" / ")}
                    </p>
                    <div className="flex items-center gap-2 text-[0.85rem]">
                      <StarsRow compact />
                      <span className="ml-2 text-sm text-[var(--muted)]">5</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {seller.gallery.map((image, index) => (
                        <div
                          className="relative aspect-square overflow-hidden rounded-[12px] bg-[rgba(143,107,255,0.08)]"
                          key={`${seller.slug}-${index}`}
                        >
                          {image ? (
                            <Image
                              alt={image.altText}
                              className="object-cover"
                              fill
                              sizes="120px"
                              src={image.url}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="relative px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(63,31,137,0.72),rgba(31,14,74,0.96))]" />
            <div className="relative">
              <SectionHeader
                actionHref="/products"
                actionLabel="See all"
                actionTone="dark"
                title="Why Shop with Velora?"
                titleTone="dark"
              />

              <div className="mt-8 grid gap-4">
                {valueItems.map((item) => (
                  <div
                    className="overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(103,70,192,0.28),rgba(72,42,159,0.28))] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    key={item.title}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)] opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(184,141,255,0.9),rgba(115,155,255,0.9))] text-sm font-bold text-white shadow-[0_10px_24px_rgba(17,8,45,0.2)]">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-[var(--font-heading)] text-[1.9rem] font-bold tracking-tight text-white">
                          {item.title}
                        </h3>
                        <p className="mt-2 max-w-xl text-sm leading-7 text-white/72">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1.26fr)_minmax(320px,0.74fr)]">
          <section className="relative overflow-hidden px-6 py-9 text-white sm:px-8 lg:px-10 lg:py-12 xl:border-r xl:border-white/10 xl:px-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_12%,rgba(255,204,237,0.16),transparent_18%),linear-gradient(135deg,rgba(127,90,239,0.28),rgba(62,31,141,0.92))]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.08)_48%,transparent_70%)] opacity-60" />

            <div className="relative max-w-4xl space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/58">
                Seller growth
              </p>
              <h2 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight sm:text-[3.85rem] sm:leading-[1.02]">
                Start Selling on Velora Today!
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-white/72">
                Join our community of sellers and grow your business.
              </p>
              <Link className={primaryHeroButtonClass} href="/become-a-seller">
                Get Started
                <ChevronRightIcon />
              </Link>
            </div>
          </section>

          <section className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,241,255,0.96))] px-6 py-9 text-[var(--foreground)] sm:px-8 lg:px-10 lg:py-10 xl:px-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Customer Reviews
            </p>
            <div className="mt-6 rounded-[24px] bg-white px-6 py-6 shadow-[0_18px_44px_rgba(28,13,67,0.08)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(143,107,255,0.16),rgba(232,140,255,0.16))] text-sm font-bold text-[var(--accent-dark)]">
                  VM
                </div>
                <div>
                  <StarsRow compact />
                </div>
              </div>
              <p className="mt-5 text-base leading-8 text-[var(--muted)]">
                &ldquo;Velora already feels like a real marketplace build. The
                storefront, checkout, seller tools, and admin console all stay
                connected instead of pretending to be separate demos.&rdquo;
              </p>
              <p className="mt-4 text-right text-sm font-semibold text-[var(--foreground)]">
                - Marketplace review panel
              </p>
            </div>
          </section>
        </div>
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
  const actionClass = actionTone === "light" ? lightActionClass : darkActionClass;

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

function StarsRow({ compact = false }: { compact?: boolean }): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 text-[#f2a33d]">
      {Array.from({ length: 5 }).map((_, index) => (
        <StarIcon key={`${compact ? "compact" : "default"}-${index}`} size={compact ? 14 : 15} />
      ))}
    </div>
  );
}

function buildCategoryCards(
  categories: CategorySummary[],
  items: ProductListItem[]
) {
  return categories.map((category) => ({
    ...category,
    image:
      items.find((item) => item.category?.slug === category.slug)?.image ?? null
  }));
}

function buildSellerSpotlights(items: ProductListItem[]): SellerSpotlight[] {
  const sellerMap = new Map<
    string,
    {
      slug: string;
      name: string;
      categories: Set<string>;
      heroImage: ProductListItem["image"];
      gallery: Array<ProductListItem["image"]>;
    }
  >();

  for (const item of items) {
    const entry = sellerMap.get(item.seller.slug) ?? {
      slug: item.seller.slug,
      name: item.seller.name,
      categories: new Set<string>(),
      heroImage: item.image,
      gallery: []
    };

    if (item.category?.name) {
      entry.categories.add(item.category.name);
    }

    if (!entry.heroImage && item.image) {
      entry.heroImage = item.image;
    }

    if (entry.gallery.length < 3) {
      entry.gallery.push(item.image);
    }

    sellerMap.set(item.seller.slug, entry);
  }

  return [...sellerMap.values()].slice(0, 3).map((entry) => ({
    ...entry,
    categories: [...entry.categories].slice(0, 2)
  }));
}

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

function ChevronRightIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="ml-2"
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

function StarIcon({ size }: { size: number }): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 20 20"
      width={size}
    >
      <path d="m10 1.9 2.15 4.36 4.82.7-3.49 3.4.82 4.8L10 12.9l-4.3 2.26.82-4.8-3.49-3.4 4.82-.7L10 1.9Z" />
    </svg>
  );
}
