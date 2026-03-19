import Image from "next/image";
import Link from "next/link";

import type { CategorySummary, ProductListItem } from "@velora/contracts";
import { Badge, Panel } from "@velora/ui";

import { ApiUnavailablePanel } from "../components/api-unavailable-panel";
import { StorefrontChrome } from "../components/storefront-chrome";
import { formatMoney } from "../lib/formatting";
import {
  getCatalogNavigation,
  getDomainOverview,
  searchCatalog
} from "../lib/storefront-api";

const primaryLinkClass =
  "inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-soft),var(--accent))] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_20px_48px_rgba(139,94,255,0.35)] transition-transform hover:-translate-y-0.5";

const secondaryLinkClass =
  "inline-flex items-center justify-center rounded-full border border-white/12 bg-white/8 px-6 py-3.5 text-sm font-semibold text-white/88 transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/12";

const lightActionClass =
  "inline-flex items-center justify-center rounded-full border border-[rgba(107,80,201,0.12)] bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--foreground)] shadow-[0_10px_30px_rgba(33,18,74,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white";

const benefitItems = [
  {
    title: "Curated marketplace",
    description:
      "Browse a premium multi-seller catalog with category depth, offer-level pricing, and product detail surfaces that stay tied to the live commerce engine."
  },
  {
    title: "Secure payments",
    description:
      "Checkout, payment attempts, webhook handling, and order state changes are already modeled like a production marketplace instead of a shallow demo."
  },
  {
    title: "Operator clarity",
    description:
      "Admin and seller workspaces stay connected to the same catalog, inventory, promotion, and fulfillment state visible in the storefront."
  }
] as const;

const reviewHighlights = [
  "Live catalog navigation",
  "Funding-aware promotions",
  "Guest and account checkout"
] as const;

export default async function HomePage(): Promise<React.JSX.Element> {
  const [catalogOverview, promotionOverview, navigation, featuredProducts] =
    await Promise.all([
      getDomainOverview("/catalog/overview"),
      getDomainOverview("/promotions/overview"),
      getCatalogNavigation(),
      searchCatalog({
        sort: "newest",
        pageSize: "6"
      })
    ]);

  const categories = navigation?.featuredCategories.slice(0, 3) ?? [];
  const trendingProducts = featuredProducts?.items.slice(0, 3) ?? [];
  const spotlightSellers = buildSellerSpotlights(featuredProducts?.items ?? []);

  return (
    <StorefrontChrome>
      <section className="relative overflow-hidden rounded-[40px] bg-[linear-gradient(140deg,rgba(52,25,110,0.95),rgba(20,9,48,0.98))] px-6 py-8 text-white shadow-[0_34px_120px_rgba(7,3,24,0.42)] sm:px-8 lg:px-10 lg:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(207,143,255,0.34),transparent_20%),radial-gradient(circle_at_82%_8%,rgba(255,176,222,0.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_42%)]" />
        <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-[linear-gradient(130deg,transparent_0%,transparent_48%,rgba(255,255,255,0.08)_49%,transparent_69%)] opacity-60" />

        <div className="relative grid gap-12 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:items-center">
          <div className="space-y-7">
            <Badge className="border-white/10 bg-white/8 text-white/68">
              Curated marketplace experience
            </Badge>
            <div className="space-y-5">
              <h1 className="max-w-3xl font-[var(--font-heading)] text-5xl font-extrabold tracking-tight sm:text-6xl xl:text-7xl">
                Discover and shop premium products from an operator-ready
                multi-seller marketplace.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/68">
                Velora blends a polished storefront with live catalog, pricing,
                checkout, seller, and backoffice flows so the project feels like
                a real marketplace platform, not a static concept page.
              </p>
            </div>

            <form
              action="/search"
              className="flex min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/92 p-2 text-[var(--foreground)] shadow-[0_22px_70px_rgba(8,3,26,0.24)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(110,78,241,0.12)] text-[var(--accent-dark)]">
                <SearchIcon />
              </span>
              <input
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                name="q"
                placeholder="Search for products, brands, or seller offers"
                type="search"
              />
              <button className={primaryLinkClass} type="submit">
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-3">
              <Link className={secondaryLinkClass} href="/categories">
                Browse categories
              </Link>
              <Link className={secondaryLinkClass} href="/become-a-seller">
                Sell on Velora
              </Link>
            </div>

            <div className="flex flex-wrap gap-3">
              {reviewHighlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/76"
                >
                  {highlight}
                </span>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <HeroMetric
                label="Live products"
                value={String(catalogOverview?.metrics.products ?? 0)}
              />
              <HeroMetric
                label="Active campaigns"
                value={String(promotionOverview?.metrics.activePromotions ?? 0)}
              />
              <HeroMetric
                label="Featured categories"
                value={String(navigation?.featuredCategories.length ?? 0)}
              />
            </div>
          </div>

          <div className="relative min-h-[520px] overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_28px_90px_rgba(7,3,24,0.48)] lg:min-h-[620px]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_78%_18%,rgba(255,189,228,0.18),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%)]" />
            <div className="absolute inset-0">
              <Image
                alt="Velora hero"
                className="object-cover object-center"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                src="/brand/hero-img.png"
              />
            </div>
            <div className="absolute right-[4%] top-[6%] z-20 rounded-[28px] bg-[linear-gradient(180deg,rgba(18,9,47,0.56),rgba(18,9,47,0.32))] px-5 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-white/60">
                Trending now
              </p>
              <p className="mt-2 max-w-[180px] text-sm leading-6 text-white/82">
                Marketplace-ready catalog visuals with seller-backed offers and
                pricing.
              </p>
            </div>
            <div className="absolute bottom-[5%] left-[4%] z-20 rounded-[26px] bg-[linear-gradient(180deg,rgba(18,9,47,0.58),rgba(18,9,47,0.34))] px-5 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-white/60">
                Marketplace pulse
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {(catalogOverview?.metrics.products ?? 0).toLocaleString()} items
              </p>
              <p className="mt-1 text-sm text-white/74">
                indexed across seeded category depth
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <Panel className="overflow-hidden border-transparent bg-[linear-gradient(180deg,rgba(42,20,96,0.84),rgba(25,13,62,0.92))] px-7 py-7 text-white shadow-[0_22px_80px_rgba(8,3,26,0.34)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/58">
                Featured collections
              </p>
              <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
                Browse curated category entry points.
              </h2>
            </div>
            <Link className={secondaryLinkClass} href="/categories">
              View all
            </Link>
          </div>

          {categories.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {categories.map((category, index) => (
                <CollectionCard
                  category={category}
                  index={index}
                  key={category.slug}
                />
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
        </Panel>

        <Panel className="overflow-hidden border-transparent bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,232,255,0.9))] px-7 py-7 shadow-[0_22px_80px_rgba(8,3,26,0.18)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Trending products
              </p>
              <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-bold tracking-tight text-[var(--foreground)]">
                Freshly indexed offers with live pricing.
              </h2>
            </div>
            <Link className={lightActionClass} href="/products?sort=newest">
              See all
            </Link>
          </div>

          {trendingProducts.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {trendingProducts.map((item) => (
                <TrendingProductCard item={item} key={item.listingId} />
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
        </Panel>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Panel className="overflow-hidden border-transparent bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,239,255,0.92))] px-7 py-7 shadow-[0_22px_80px_rgba(8,3,26,0.16)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Seller spotlights
              </p>
              <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-bold tracking-tight text-[var(--foreground)]">
                Marketplace operators already seeded into Velora.
              </h2>
            </div>
            <Link className={lightActionClass} href="/become-a-seller">
              Join sellers
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {spotlightSellers.map((seller) => (
              <SellerSpotlightCard key={seller.slug} seller={seller} />
            ))}
          </div>
        </Panel>

        <Panel className="overflow-hidden border-transparent bg-[linear-gradient(180deg,rgba(44,20,98,0.88),rgba(24,11,57,0.96))] px-7 py-7 text-white shadow-[0_22px_80px_rgba(8,3,26,0.34)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/58">
                Why shop with Velora
              </p>
              <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
                Built like a serious marketplace, not a mock shell.
              </h2>
            </div>
            <Link className={secondaryLinkClass} href="/products">
              Explore
            </Link>
          </div>

          <div className="mt-8 grid gap-5">
            {benefitItems.map((item, index) => (
              <BenefitCard index={index} item={item} key={item.title} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <Panel className="overflow-hidden border-transparent bg-[linear-gradient(135deg,rgba(58,29,126,0.94),rgba(24,11,59,0.98))] px-8 py-10 text-white shadow-[0_24px_90px_rgba(8,3,26,0.4)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,177,223,0.24),transparent_25%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.06)_48%,transparent_72%)]" />
          <div className="relative max-w-3xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/58">
              Seller growth
            </p>
            <h2 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
              Start selling on Velora with the same catalog, pricing, and
              operational clarity built into the platform.
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-white/70">
              Merchant onboarding, listing management, stock posture, order
              workflows, and seller-funded campaigns are already wired into the
              project and ready to demonstrate.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className={primaryLinkClass} href="/become-a-seller">
                Get started
              </Link>
              <Link className={secondaryLinkClass} href="/seller/login">
                Seller login
              </Link>
            </div>
          </div>
        </Panel>

        <Panel className="overflow-hidden border-transparent bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,255,0.92))] px-7 py-7 shadow-[0_22px_80px_rgba(8,3,26,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Customer review
          </p>
          <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
            &ldquo;Velora already feels like a real marketplace build.&rdquo;
          </h2>
          <p className="mt-5 text-base leading-8 text-[var(--muted)]">
            The storefront, checkout, seller tools, and admin console all stay
            connected instead of pretending to be separate demos. It reads like
            a coherent platform rather than a one-page design exercise.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(139,94,255,0.18),rgba(232,140,255,0.18))] text-lg font-bold text-[var(--accent-dark)]">
              VM
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)]">
                Marketplace review panel
              </p>
              <p className="text-sm text-[var(--muted)]">
                Product-grade UX and operational integrity
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </StorefrontChrome>
  );
}

function HeroMetric({
  label,
  value
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}

function CollectionCard({
  category,
  index
}: {
  category: CategorySummary;
  index: number;
}): React.JSX.Element {
  const gradients = [
    "from-[rgba(146,114,255,0.4)] to-[rgba(255,166,223,0.14)]",
    "from-[rgba(111,143,255,0.38)] to-[rgba(255,255,255,0.08)]",
    "from-[rgba(255,177,130,0.24)] to-[rgba(255,166,223,0.14)]"
  ];

  return (
    <Link
      className="group block rounded-[28px] bg-white/6 p-4 transition-transform hover:-translate-y-1"
      href={`/categories/${category.slug}`}
    >
      <div
        className={`relative min-h-[260px] overflow-hidden rounded-[24px] bg-gradient-to-br ${gradients[index % gradients.length]} p-5`}
      >
        <div className="absolute inset-x-5 bottom-5 rounded-[22px] bg-[linear-gradient(180deg,rgba(22,10,55,0.82),rgba(22,10,55,0.96))] px-4 py-4 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/54">
            Featured collection
          </p>
          <h3 className="mt-3 font-[var(--font-heading)] text-2xl font-bold tracking-tight">
            {category.name}
          </h3>
          <p className="mt-2 text-sm leading-7 text-white/68">
            {category.productCount} live product
            {category.productCount === 1 ? "" : "s"} in this category path.
          </p>
        </div>
      </div>
    </Link>
  );
}

function TrendingProductCard({
  item
}: {
  item: ProductListItem;
}): React.JSX.Element {
  return (
    <Link
      className="group block rounded-[28px] bg-white p-4 shadow-[0_18px_40px_rgba(27,14,67,0.08)] transition-transform hover:-translate-y-1"
      href={`/products/${item.slug}`}
    >
      <div className="relative aspect-[0.94] overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,rgba(37,17,83,0.92),rgba(83,51,167,0.82))]">
        {item.image ? (
          <Image
            alt={item.image.altText}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fill
            sizes="(min-width: 1280px) 24vw, (min-width: 768px) 30vw, 100vw"
            src={item.image.url}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/68">
            No image
          </div>
        )}
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="line-clamp-1 font-[var(--font-heading)] text-xl font-bold tracking-tight text-[var(--foreground)]">
            {item.title}
          </p>
          {item.pricing.discountPercentage ? (
            <span className="rounded-full bg-[rgba(143,107,255,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-dark)]">
              -{item.pricing.discountPercentage}%
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-[var(--muted)]">
          {item.description}
        </p>
        <div className="flex items-end justify-between gap-3">
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
          <div className="text-right text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {item.category?.name ?? "Catalog"}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SellerSpotlightCard({
  seller
}: {
  seller: {
    slug: string;
    name: string;
    categories: string[];
    image: ProductListItem["image"];
    highlightedTitles: string[];
  };
}): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_18px_40px_rgba(27,14,67,0.08)]">
      <div className="relative aspect-[1.08] bg-[linear-gradient(180deg,rgba(42,20,96,0.94),rgba(95,66,176,0.8))]">
        {seller.image ? (
          <Image
            alt={seller.image.altText}
            className="object-cover"
            fill
            sizes="(min-width: 1280px) 24vw, (min-width: 768px) 30vw, 100vw"
            src={seller.image.url}
          />
        ) : null}
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-[var(--font-heading)] text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {seller.name}
          </h3>
          <span className="rounded-full bg-[rgba(143,107,255,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-dark)]">
            Seller
          </span>
        </div>
        <p className="text-sm leading-7 text-[var(--muted)]">
          Category footprint: {seller.categories.join(" / ")}
        </p>
        <div className="grid gap-3">
          {seller.highlightedTitles.map((title) => (
            <div
              className="rounded-[18px] bg-[rgba(143,107,255,0.08)] px-3 py-2 text-sm text-[var(--foreground)]"
              key={title}
            >
              {title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BenefitCard({
  item,
  index
}: {
  item: (typeof benefitItems)[number];
  index: number;
}): React.JSX.Element {
  const iconLabels = ["CM", "SP", "OC"];

  return (
    <div className="rounded-[28px] bg-white/6 px-6 py-6 backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] text-sm font-bold text-white">
          {iconLabels[index]}
        </div>
        <div>
          <h3 className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
            {item.title}
          </h3>
          <p className="mt-2 text-sm leading-7 text-white/68">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function buildSellerSpotlights(items: ProductListItem[]) {
  const sellerMap = new Map<
    string,
    {
      slug: string;
      name: string;
      categories: Set<string>;
      image: ProductListItem["image"];
      highlightedTitles: string[];
    }
  >();

  for (const item of items) {
    const entry = sellerMap.get(item.seller.slug) ?? {
      slug: item.seller.slug,
      name: item.seller.name,
      categories: new Set<string>(),
      image: item.image,
      highlightedTitles: []
    };

    if (item.category?.name) {
      entry.categories.add(item.category.name);
    }

    if (!entry.image && item.image) {
      entry.image = item.image;
    }

    if (entry.highlightedTitles.length < 3) {
      entry.highlightedTitles.push(item.title);
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
