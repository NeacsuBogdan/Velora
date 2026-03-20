import Image from "next/image";
import Link from "next/link";

import type {
  ProductDetail,
  ProductOffer,
  ProductVariantSummary
} from "@velora/contracts";

import { AddToCartButton } from "../../../components/add-to-cart-button";
import { ApiUnavailablePanel } from "../../../components/api-unavailable-panel";
import { ProductCard } from "../../../components/product-card";
import { ProductPurchasePanel } from "../../../components/product-purchase-panel";
import { StorefrontChrome } from "../../../components/storefront-chrome";
import { formatMoney } from "../../../lib/formatting";
import { getProductDetail } from "../../../lib/storefront-api";

const primaryActionClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-white/16 bg-[linear-gradient(135deg,rgba(124,88,255,0.92),rgba(85,48,196,0.98))] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(19,9,52,0.3)] transition-all hover:-translate-y-0.5";

const secondaryActionClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 bg-[rgba(255,255,255,0.05)] px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/22 hover:bg-[rgba(255,255,255,0.1)]";

const sectionLinkClass =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-2.5 text-sm font-semibold text-white/76 transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.1)] hover:text-white";

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const product = await getProductDetail(slug);

  if (!product) {
    return (
      <StorefrontChrome>
        <ApiUnavailablePanel
          message="The storefront could not load this product because the API is unavailable or the product slug could not be resolved. Start `pnpm dev:api` and refresh first."
          retryHref="/products"
          retryLabel="Back to catalog"
          title="Product data is unavailable"
        />
      </StorefrontChrome>
    );
  }

  const leadOffer = product.offers[0] ?? null;
  const heroImage = product.gallery[0] ?? null;
  const extraGallery = product.gallery.slice(1, 4);
  const attributeGroups = buildAttributeGroups(product.variants);
  const featureItems = buildFeatureItems(product);
  const categoryHref = product.category
    ? `/categories/${product.category.slug}`
    : "/categories";

  return (
    <StorefrontChrome>
      <div className="overflow-hidden rounded-[40px] border border-white/8 bg-[linear-gradient(180deg,rgba(46,20,104,0.96),rgba(24,10,57,0.98))] shadow-[0_40px_120px_rgba(7,3,24,0.44)]">
        <section className="relative border-b border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12 xl:py-12">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <Image
              alt={`${product.title} hero`}
              className="object-cover object-[64%_center]"
              fill
              priority
              sizes="100vw"
              src="/brand/hero-img.png"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,10,66,0.96)_0%,rgba(40,18,94,0.88)_34%,rgba(56,26,120,0.52)_60%,rgba(20,9,50,0.44)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(226,147,255,0.16),transparent_22%),radial-gradient(circle_at_84%_10%,rgba(255,203,234,0.16),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_32%)]" />
          </div>

          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)] lg:items-center">
            <div className="max-w-[38rem] space-y-7">
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/58">
                <Link className="transition-colors hover:text-white" href="/">
                  Home
                </Link>
                <span>/</span>
                <Link className="transition-colors hover:text-white" href="/products">
                  Products
                </Link>
                {product.breadcrumbs.map((crumb) => (
                  <span key={crumb.slug} className="inline-flex items-center gap-2">
                    <span>/</span>
                    <Link
                      className="transition-colors hover:text-white"
                      href={`/categories/${crumb.slug}`}
                    >
                      {crumb.name}
                    </Link>
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {product.brand ? (
                  <span className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.07)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                    {product.brand.name}
                  </span>
                ) : null}
                {product.category ? (
                  <Link
                    className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/76 transition-colors hover:text-white"
                    href={categoryHref}
                  >
                    {product.category.name}
                  </Link>
                ) : null}
                <span className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/76">
                  {product.offers.length} seller {product.offers.length === 1 ? "offer" : "offers"}
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl font-[var(--font-heading)] text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl xl:text-[4.9rem] xl:leading-[1.02]">
                  {product.title}
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-white/72">
                  {product.description}
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <p className="font-[var(--font-heading)] text-5xl font-bold tracking-tight text-white sm:text-6xl">
                  {leadOffer ? formatMoney(leadOffer.pricing.current) : "Unavailable"}
                </p>
                {leadOffer?.pricing.compareAt ? (
                  <p className="pb-2 text-lg text-white/52 line-through">
                    {formatMoney(leadOffer.pricing.compareAt)}
                  </p>
                ) : null}
                {leadOffer?.pricing.discountPercentage ? (
                  <span className="rounded-full border border-white/14 bg-[rgba(223,172,255,0.16)] px-4 py-2 text-sm font-semibold text-white">
                    {leadOffer.pricing.discountPercentage}% off
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  detail={leadOffer ? `SKU ${leadOffer.sellerSku}` : "No active listing"}
                  label="Lead seller"
                  value={leadOffer?.seller.name ?? "Unavailable"}
                />
                <MetricCard
                  detail={
                    leadOffer?.availability.inStock
                      ? `${leadOffer.availability.availableQuantity} ready right now`
                      : "Currently unavailable"
                  }
                  label="Availability"
                  value={
                    leadOffer?.availability.inStock
                      ? `${leadOffer.availability.availableQuantity} units`
                      : "Out of stock"
                  }
                />
                <MetricCard
                  detail={
                    leadOffer
                      ? `Ships in ${leadOffer.availability.leadTimeDays} day(s)`
                      : "Waiting for active seller coverage"
                  }
                  label="Fulfillment"
                  value={
                    leadOffer
                      ? `${leadOffer.availability.leadTimeDays} day lead`
                      : "Unavailable"
                  }
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Link className={primaryActionClass} href="#purchase">
                  Configure &amp; buy
                  <ChevronRightIcon />
                </Link>
                <Link className={secondaryActionClass} href="#offers">
                  Compare seller offers
                  <ChevronRightIcon />
                </Link>
              </div>
            </div>

            <div className="relative flex min-h-[430px] items-center justify-center">
              <div className="absolute inset-x-0 bottom-0 top-12 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
              <div className="absolute inset-x-[8%] bottom-6 h-40 rounded-full bg-[radial-gradient(circle,rgba(247,198,255,0.28),rgba(150,109,255,0.06)_58%,transparent_75%)] blur-2xl" />

              <div className="relative flex h-full w-full items-center justify-center px-6 pb-14 pt-10">
                {heroImage ? (
                  <div className="relative h-full min-h-[380px] w-full">
                    <Image
                      alt={heroImage.altText}
                      className="object-contain drop-shadow-[0_34px_80px_rgba(12,4,36,0.44)]"
                      fill
                      sizes="(min-width: 1280px) 42vw, 100vw"
                      src={heroImage.url}
                    />
                  </div>
                ) : (
                  <div className="flex h-full min-h-[380px] w-full items-center justify-center rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.05)] text-center text-white/56">
                    Product media is unavailable.
                  </div>
                )}
              </div>

              {extraGallery.length ? (
                <div className="absolute bottom-5 left-5 flex flex-wrap gap-3">
                  {extraGallery.map((media) => (
                    <div
                      className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.08)] shadow-[0_10px_24px_rgba(10,4,30,0.28)] backdrop-blur"
                      key={media.url}
                    >
                      <Image
                        alt={media.altText}
                        className="object-cover"
                        fill
                        sizes="72px"
                        src={media.url}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <nav className="border-b border-white/10 px-6 py-5 sm:px-8 lg:px-10 xl:px-12">
          <div className="flex flex-wrap gap-3">
            <Link className={sectionLinkClass} href="#description">
              Description
            </Link>
            <Link className={sectionLinkClass} href="#features">
              Features
            </Link>
            <Link className={sectionLinkClass} href="#shipping">
              Shipping
            </Link>
            <Link className={sectionLinkClass} href="#specifications">
              Specifications
            </Link>
            <Link className={sectionLinkClass} href="#offers">
              Seller offers
            </Link>
            <Link className={sectionLinkClass} href="#related">
              Related products
            </Link>
          </div>
        </nav>

        <div className="grid gap-6 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] xl:px-12">
          <section className="space-y-6" id="purchase">
            {leadOffer ? (
              <ProductPurchasePanel
                attributeGroups={attributeGroups}
                availableQuantity={leadOffer.availability.availableQuantity}
                inStock={leadOffer.availability.inStock}
                leadTimeDays={leadOffer.availability.leadTimeDays}
                listingId={leadOffer.listingId}
                sellerName={leadOffer.seller.name}
                sellerSku={leadOffer.sellerSku}
              />
            ) : (
              <NoticePanel
                body="The product record exists, but no seller currently has a live offer to purchase. Check the seller-offer section below after the marketplace refreshes."
                title="No active seller offer is available right now."
              />
            )}

            <section
              className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(73,38,155,0.2),rgba(24,10,57,0.82))] p-6 shadow-[0_18px_44px_rgba(10,4,30,0.22)] backdrop-blur-sm sm:p-7"
              id="description"
            >
              <SectionEyebrow>Product overview</SectionEyebrow>
              <h2 className="mt-3 font-[var(--font-heading)] text-[2.2rem] font-bold tracking-tight text-white">
                Built for the same live marketplace flows as search, cart, and checkout.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-white/70">
                {product.description}
              </p>
              {product.highlights.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {product.highlights.map((highlight) => (
                    <span
                      className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm text-white/74"
                      key={`${highlight.name}-${highlight.value}`}
                    >
                      {highlight.name}: {highlight.value}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          </section>

          <section className="space-y-6">
            <section
              className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(73,38,155,0.2),rgba(24,10,57,0.82))] p-6 shadow-[0_18px_44px_rgba(10,4,30,0.22)] backdrop-blur-sm sm:p-7"
              id="features"
            >
              <SectionEyebrow>Features</SectionEyebrow>
              <h2 className="mt-3 font-[var(--font-heading)] text-[2rem] font-bold tracking-tight text-white">
                What stands out in the live product projection.
              </h2>
              {featureItems.length ? (
                <ul className="mt-5 space-y-3 text-base leading-7 text-white/74">
                  {featureItems.map((feature) => (
                    <li className="flex gap-3" key={feature}>
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[rgba(232,140,255,0.88)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-base leading-7 text-white/64">
                  Rich highlights will appear here as the catalog content grows.
                </p>
              )}
            </section>

            <section
              className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(73,38,155,0.2),rgba(24,10,57,0.82))] p-6 shadow-[0_18px_44px_rgba(10,4,30,0.22)] backdrop-blur-sm sm:p-7"
              id="shipping"
            >
              <SectionEyebrow>Shipping and service</SectionEyebrow>
              <h2 className="mt-3 font-[var(--font-heading)] text-[2rem] font-bold tracking-tight text-white">
                Delivery expectations stay grounded in live offer data.
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ServiceCard
                  detail={
                    leadOffer
                      ? `Lead offer ships in ${leadOffer.availability.leadTimeDays} day(s).`
                      : "Shipping estimates return once a seller activates this product."
                  }
                  title="Fulfillment timing"
                />
                <ServiceCard
                  detail="Guest checkout, secure payment capture, and stock reservation are live on this product flow."
                  title="Secure checkout"
                />
                <ServiceCard
                  detail={
                    leadOffer?.availability.inStock
                      ? `${leadOffer.availability.availableQuantity} units are available on the lead offer.`
                      : "No units are currently available on the lead offer."
                  }
                  title="Stock posture"
                />
                <ServiceCard
                  detail={`${product.offers.length} marketplace ${product.offers.length === 1 ? "seller currently covers" : "sellers currently cover"} this product record.`}
                  title="Marketplace coverage"
                />
              </div>
            </section>
          </section>
        </div>

        <section className="border-t border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12" id="specifications">
          <SectionHeader
            actionHref="#purchase"
            actionLabel="Back to purchase"
            title="Detailed technical and catalog information"
          />
          {product.specifications.length ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {product.specifications.map((group) => (
                <div
                  className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-5 shadow-[0_18px_44px_rgba(12,4,36,0.18)]"
                  key={group.title}
                >
                  <h3 className="font-[var(--font-heading)] text-[1.6rem] font-bold tracking-tight text-white">
                    {group.title}
                  </h3>
                  <div className="mt-4 grid gap-3">
                    {group.items.map((item) => (
                      <div
                        className="flex items-start justify-between gap-4 border-b border-white/8 pb-3 text-sm last:border-b-0 last:pb-0"
                        key={`${group.title}-${item.label}`}
                      >
                        <span className="text-white/54">{item.label}</span>
                        <span className="text-right font-medium text-white/84">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-6 py-6 text-white/64">
              Detailed specifications are not available for this item yet.
            </div>
          )}
        </section>

        <section className="border-t border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12" id="offers">
          <SectionHeader
            actionHref="#purchase"
            actionLabel="Use lead offer"
            title="Compare marketplace supply on one product record"
          />
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">
            The purchase panel above defaults to the lead offer, but every live seller listing stays accessible here.
          </p>
          {product.offers.length ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {product.offers.map((offer) => (
                <OfferCard key={offer.listingId} offer={offer} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-6 py-6 text-white/64">
              No seller currently has an active offer on this product.
            </div>
          )}
        </section>

        <section className="border-t border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12" id="related">
          <SectionHeader
            actionHref={categoryHref}
            actionLabel="Explore category"
            title="Related products from the same discovery flow"
          />
          {product.relatedProducts.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {product.relatedProducts.map((item) => (
                <ProductCard item={item} key={item.listingId} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-6 py-6 text-white/64">
              Related-product recommendations are not available right now.
            </div>
          )}
        </section>

        <section className="border-t border-white/10 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(119,80,232,0.34),rgba(45,19,106,0.9))] px-6 py-8 shadow-[0_24px_64px_rgba(9,4,28,0.3)] sm:px-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(255,210,240,0.18),transparent_16%),linear-gradient(100deg,transparent_8%,rgba(255,255,255,0.06)_50%,transparent_72%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="space-y-3">
                <SectionEyebrow>Keep exploring</SectionEyebrow>
                <h2 className="font-[var(--font-heading)] text-[2.4rem] font-bold tracking-tight text-white sm:text-[3rem]">
                  Discover more live offers, promotions, and category depth on Velora.
                </h2>
                <p className="max-w-3xl text-base leading-8 text-white/72">
                  Compare more seller supply, continue browsing the seeded catalog, or jump straight into the wider marketplace category connected to this product.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className={primaryActionClass} href={categoryHref}>
                  Explore category
                  <ChevronRightIcon />
                </Link>
                <Link className={secondaryActionClass} href="/products">
                  Browse all products
                  <ChevronRightIcon />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StorefrontChrome>
  );
}

function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}): React.JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/48">
        {label}
      </p>
      <p className="mt-2 line-clamp-2 font-[var(--font-heading)] text-[1.45rem] font-bold leading-[1.15] tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/62">{detail}</p>
    </div>
  );
}

function NoticePanel({
  title,
  body
}: {
  title: string;
  body: string;
}): React.JSX.Element {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(73,38,155,0.24),rgba(29,13,68,0.88))] p-6 shadow-[0_22px_54px_rgba(10,4,30,0.24)] backdrop-blur-sm sm:p-7">
      <SectionEyebrow>Purchase setup</SectionEyebrow>
      <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-bold tracking-tight text-white">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-white/66">{body}</p>
    </div>
  );
}

function SectionHeader({
  title,
  actionLabel,
  actionHref
}: {
  title: string;
  actionLabel: string;
  actionHref: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <SectionEyebrow>Product detail</SectionEyebrow>
        <h2 className="mt-3 font-[var(--font-heading)] text-[2.35rem] font-bold tracking-tight text-white">
          {title}
        </h2>
      </div>
      <Link className={secondaryActionClass} href={actionHref}>
        {actionLabel}
        <ChevronRightIcon />
      </Link>
    </div>
  );
}

function SectionEyebrow({
  children
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">
      {children}
    </p>
  );
}

function ServiceCard({
  title,
  detail
}: {
  title: string;
  detail: string;
}): React.JSX.Element {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-5 py-5">
      <h3 className="font-[var(--font-heading)] text-[1.45rem] font-bold tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-white/66">{detail}</p>
    </div>
  );
}

function OfferCard({ offer }: { offer: ProductOffer }): React.JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-5 shadow-[0_18px_44px_rgba(12,4,36,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="font-[var(--font-heading)] text-[1.7rem] font-bold tracking-tight text-white">
            {offer.seller.name}
          </p>
          <p className="text-sm text-white/58">SKU {offer.sellerSku}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${
            offer.availability.inStock
              ? "border border-white/12 bg-[rgba(255,255,255,0.07)] text-white"
              : "border border-white/8 bg-[rgba(255,255,255,0.04)] text-white/56"
          }`}
        >
          {offer.availability.inStock ? "In stock" : "Unavailable"}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
        <p className="font-[var(--font-heading)] text-[2rem] font-bold tracking-tight text-white">
          {formatMoney(offer.pricing.current)}
        </p>
        {offer.pricing.compareAt ? (
          <p className="pb-1 text-sm text-white/46 line-through">
            {formatMoney(offer.pricing.compareAt)}
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-4 text-sm text-white/66">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/44">
            Stock
          </p>
          <p className="mt-2 text-base font-semibold text-white">
            {offer.availability.inStock
              ? `${offer.availability.availableQuantity} available`
              : "Out of stock"}
          </p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-4 text-sm text-white/66">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/44">
            Lead time
          </p>
          <p className="mt-2 text-base font-semibold text-white">
            {offer.availability.leadTimeDays} day(s)
          </p>
        </div>
      </div>

      <div className="mt-5">
        <AddToCartButton
          className="w-full rounded-full border border-white/14 bg-[linear-gradient(135deg,rgba(124,88,255,0.92),rgba(85,48,196,0.98))] text-white shadow-[0_18px_48px_rgba(19,9,52,0.24)] transition-all hover:-translate-y-0.5"
          disabled={!offer.availability.inStock}
          label={offer.availability.inStock ? "Add this offer" : "Offer unavailable"}
          listingId={offer.listingId}
        />
      </div>
    </div>
  );
}

function buildAttributeGroups(variants: ProductVariantSummary[]) {
  const groups = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const attribute of variant.attributes) {
      if (!groups.has(attribute.name)) {
        groups.set(attribute.name, new Set<string>());
      }

      groups.get(attribute.name)?.add(attribute.value);
    }
  }

  return [...groups.entries()].map(([name, values]) => ({
    name,
    values: [...values]
  }));
}

function buildFeatureItems(product: ProductDetail): string[] {
  const highlightItems = product.highlights.map(
    (highlight) => `${highlight.name}: ${highlight.value}`
  );
  const specificationItems = product.specifications.flatMap((group) =>
    group.items.map((item) => `${item.label}: ${item.value}`)
  );

  return [...new Set([...highlightItems, ...specificationItems])].slice(0, 6);
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
