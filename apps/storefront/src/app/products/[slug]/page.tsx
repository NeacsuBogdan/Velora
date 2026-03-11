import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Panel } from "@velora/ui";

import { AddToCartButton } from "../../../components/add-to-cart-button";
import { ProductCard } from "../../../components/product-card";
import { StorefrontChrome } from "../../../components/storefront-chrome";
import { formatMoney } from "../../../lib/formatting";
import { getProductDetail } from "../../../lib/storefront-api";

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const product = await getProductDetail(slug);

  if (!product) {
    notFound();
  }

  const leadOffer = product.offers[0];

  return (
    <StorefrontChrome>
      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/products">Products</Link>
        {product.breadcrumbs.map((crumb) => (
          <span key={crumb.slug}>/ {crumb.name}</span>
        ))}
        <span>/ {product.title}</span>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel className="grid gap-6 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="flex aspect-square items-center justify-center rounded-[28px] bg-[linear-gradient(160deg,rgba(248,246,241,0.96),rgba(233,238,243,0.96))] p-6">
              {product.gallery[0] ? (
                <Image
                  alt={product.gallery[0].altText}
                  className="h-full w-full object-contain"
                  height={720}
                  src={product.gallery[0].url}
                  width={720}
                />
              ) : (
                <div className="text-sm text-[var(--muted)]">No image</div>
              )}
            </div>
            {product.gallery.length > 1 ? (
              <div className="grid grid-cols-3 gap-3">
                {product.gallery.slice(1).map((media) => (
                  <div
                    key={media.url}
                    className="flex aspect-square items-center justify-center rounded-[20px] border border-[var(--stroke)] bg-white p-3"
                  >
                    <Image
                      alt={media.altText}
                      className="h-full w-full object-contain"
                      height={240}
                      src={media.url}
                      width={240}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="space-y-3">
              {product.brand ? <Badge>{product.brand.name}</Badge> : null}
              <div>
                <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">
                  {product.title}
                </h1>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  {product.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {product.highlights.map((highlight) => (
                <span
                  key={`${highlight.name}-${highlight.value}`}
                  className="rounded-full bg-black/5 px-4 py-2 text-sm text-[var(--foreground)]"
                >
                  {highlight.name}: {highlight.value}
                </span>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {product.variants.map((variant) => (
                <div
                  key={variant.id}
                  className="rounded-[22px] border border-[var(--stroke)] bg-black/3 px-4 py-4"
                >
                  <p className="font-semibold text-[var(--foreground)]">
                    {variant.title}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {variant.attributes.map((attribute) => attribute.value).join(" / ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Best current offer
            </p>
            <p className="mt-3 font-[var(--font-heading)] text-5xl font-bold tracking-tight">
              {leadOffer ? formatMoney(leadOffer.pricing.current) : "Unavailable"}
            </p>
            {leadOffer?.pricing.compareAt ? (
              <p className="mt-2 text-sm text-[var(--muted)] line-through">
                {formatMoney(leadOffer.pricing.compareAt)}
              </p>
            ) : null}
          </div>

          <div className="rounded-[24px] bg-black/4 p-4 text-sm text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">
              {leadOffer?.seller.name ?? "No active seller"}
            </p>
            <p className="mt-2">
              {leadOffer?.availability.inStock
                ? `${leadOffer.availability.availableQuantity} units ready to ship`
                : "This offer is currently unavailable"}
            </p>
            <p className="mt-1">
              Lead time: {leadOffer?.availability.leadTimeDays ?? "-"} day(s)
            </p>
          </div>

          {leadOffer ? (
            <AddToCartButton
              className="w-full"
              disabled={!leadOffer.availability.inStock}
              label={
                leadOffer.availability.inStock
                  ? "Add lead offer to cart"
                  : "Lead offer unavailable"
              }
              listingId={leadOffer.listingId}
            />
          ) : null}

          <div className="space-y-3">
            <p className="text-sm font-semibold">Seller offers</p>
            <div className="grid gap-3">
              {product.offers.map((offer) => (
                <div
                  key={offer.listingId}
                  className="rounded-[22px] border border-[var(--stroke)] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        {offer.seller.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        SKU {offer.sellerSku}
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      {formatMoney(offer.pricing.current)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {offer.availability.inStock
                      ? `${offer.availability.availableQuantity} in stock`
                      : "Out of stock"}
                  </p>
                  <div className="mt-4">
                    <AddToCartButton
                      className="w-full"
                      disabled={!offer.availability.inStock}
                      label={
                        offer.availability.inStock
                          ? "Add this offer"
                          : "Offer unavailable"
                      }
                      listingId={offer.listingId}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel className="space-y-4">
          <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
            Specifications
          </h2>
          <div className="grid gap-4">
            {product.specifications.map((group) => (
              <div key={group.title} className="rounded-[24px] bg-black/3 p-4">
                <p className="font-semibold text-[var(--foreground)]">
                  {group.title}
                </p>
                <div className="mt-3 grid gap-2">
                  {group.items.map((item) => (
                    <div
                      key={`${group.title}-${item.label}`}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="text-[var(--muted)]">{item.label}</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Related products
              </p>
              <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                Similar products
              </h2>
            </div>
            <Link className="text-sm font-semibold" href="/products">
              Back to catalog
            </Link>
          </div>
          <div className="grid gap-4">
            {product.relatedProducts.map((item) => (
              <ProductCard key={item.listingId} item={item} />
            ))}
          </div>
        </Panel>
      </section>
    </StorefrontChrome>
  );
}
