"use client";

import type {
  PromotionSummary,
  SellerProductCreationOptions,
  SellerListingCatalogOption,
  SellerListingSummary
} from "@velora/contracts";
import { Button, Panel } from "@velora/ui";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { formatMoney } from "../lib/formatting";
import { SellerPromotionManager } from "./seller-promotion-manager";
import { StatusBadge } from "./status-badge";

const sellerApiBaseUrl = "/api/seller";

export function SellerInventoryManager({
  catalogOptions,
  creationOptions,
  listings,
  promotions
}: {
  catalogOptions: SellerListingCatalogOption[];
  creationOptions: SellerProductCreationOptions | null;
  listings: SellerListingSummary[];
  promotions: PromotionSummary[];
}): React.JSX.Element {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [selectedProductId, setSelectedProductId] = useState(
    catalogOptions[0]?.productId ?? ""
  );
  const [selectedVariantId, setSelectedVariantId] = useState(
    resolveDefaultVariantId(catalogOptions[0])
  );

  const selectedProduct =
    catalogOptions.find((option) => option.productId === selectedProductId) ??
    null;
  const createDisabled = !selectedProduct;
  const catalogCreationDisabled = !creationOptions?.categories.length;
  const [selectedListingId, setSelectedListingId] = useState(
    listings[0]?.listingId ?? ""
  );
  const selectedListing =
    listings.find((listing) => listing.listingId === selectedListingId) ?? null;

  useEffect(() => {
    if (!listings.length) {
      if (selectedListingId) {
        setSelectedListingId("");
      }

      return;
    }

    if (!listings.some((listing) => listing.listingId === selectedListingId)) {
      setSelectedListingId(listings[0]?.listingId ?? "");
    }
  }, [listings, selectedListingId]);

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const feedbackKey = "create";
    setPendingKey(feedbackKey);
    clearFeedback(feedbackKey);

    const formData = new FormData(event.currentTarget);
    const compareAtRaw = String(formData.get("compareAtAmount") ?? "").trim();
    const priceAmount = parseMajorUnitInputToMinor(
      String(formData.get("priceAmount") ?? "").trim()
    );
    const compareAtAmount = compareAtRaw
      ? parseMajorUnitInputToMinor(compareAtRaw)
      : null;

    if (priceAmount === null) {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]: "Enter a valid current price in RON, for example 20 or 20.00."
      }));
      setPendingKey(null);
      return;
    }

    if (compareAtRaw && compareAtAmount === null) {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "Enter a valid compare-at price in RON, for example 30 or 30.00."
      }));
      setPendingKey(null);
      return;
    }

    const payload = {
      productId: selectedProductId,
      variantId: selectedVariantId || null,
      sellerSku: String(formData.get("sellerSku") ?? "").trim(),
      leadTimeDays: Number(formData.get("leadTimeDays")),
      priceAmount,
      compareAtAmount,
      onHand: Number(formData.get("onHand")),
      safetyStock: Number(formData.get("safetyStock")),
      isActive: String(formData.get("isActive")) === "true",
      note: String(formData.get("note") ?? "").trim() || undefined
    };

    try {
      const response = await fetch(`${sellerApiBaseUrl}/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const responseMessage = await readResponseMessage(response);
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            responseMessage ??
            "The offer could not be created. Review the selected product, SKU, and pricing."
        }));
        return;
      }

      setFeedback((current) => ({
        ...current,
        [feedbackKey]: "Offer created and synced into the marketplace."
      }));

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "The API is unavailable. Start the backend and retry the offer creation."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  async function handleCreateCatalogProductSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const feedbackKey = "create-catalog-product";
    setPendingKey(feedbackKey);
    clearFeedback(feedbackKey);

    const formData = new FormData(event.currentTarget);
    const compareAtRaw = String(formData.get("compareAtAmount") ?? "").trim();
    const priceAmount = parseMajorUnitInputToMinor(
      String(formData.get("priceAmount") ?? "").trim()
    );
    const compareAtAmount = compareAtRaw
      ? parseMajorUnitInputToMinor(compareAtRaw)
      : null;
    const brandNameRaw = String(formData.get("brandName") ?? "").trim();
    const variantTitleRaw = String(formData.get("variantTitle") ?? "").trim();
    const imageUrlRaw = String(formData.get("imageUrl") ?? "").trim();
    const imageAltRaw = String(formData.get("imageAlt") ?? "").trim();

    if (priceAmount === null) {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]: "Enter a valid current price in RON, for example 20 or 20.00."
      }));
      setPendingKey(null);
      return;
    }

    if (compareAtRaw && compareAtAmount === null) {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "Enter a valid compare-at price in RON, for example 30 or 30.00."
      }));
      setPendingKey(null);
      return;
    }

    const payload = {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      categoryId: String(formData.get("categoryId") ?? "").trim(),
      brandName: brandNameRaw || null,
      variantTitle: variantTitleRaw || null,
      sellerSku: String(formData.get("sellerSku") ?? "").trim(),
      leadTimeDays: Number(formData.get("leadTimeDays")),
      priceAmount,
      compareAtAmount,
      onHand: Number(formData.get("onHand")),
      safetyStock: Number(formData.get("safetyStock")),
      isActive: String(formData.get("isActive")) === "true",
      imageUrl: imageUrlRaw || null,
      imageAlt: imageAltRaw || null,
      note: String(formData.get("note") ?? "").trim() || undefined
    };

    try {
      const response = await fetch(`${sellerApiBaseUrl}/catalog-products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const responseMessage = await readResponseMessage(response);
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            responseMessage ??
            "The product could not be created. Review the category, content, and offer values."
        }));
        return;
      }

      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "Product created, first offer published, and admin review has been notified."
      }));

      event.currentTarget.reset();

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "The API is unavailable. Start the backend and retry product creation."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  async function handleInventorySubmit(
    event: React.FormEvent<HTMLFormElement>,
    listing: SellerListingSummary
  ) {
    event.preventDefault();
    const feedbackKey = `inventory:${listing.inventoryItemId}`;
    setPendingKey(feedbackKey);
    clearFeedback(feedbackKey);

    const formData = new FormData(event.currentTarget);
    const payload = {
      onHand: Number(formData.get("onHand")),
      safetyStock: Number(formData.get("safetyStock")),
      leadTimeDays: Number(formData.get("leadTimeDays")),
      note: String(formData.get("note") ?? "").trim() || undefined
    };

    try {
      const response = await fetch(
        `${sellerApiBaseUrl}/inventory/${listing.inventoryItemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const responseMessage = await readResponseMessage(response);
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            responseMessage ??
            "The update was rejected. Review reserved stock and try again."
        }));
        return;
      }

      setFeedback((current) => ({
        ...current,
        [feedbackKey]: "Inventory synced to the commerce engine."
      }));

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "The API is unavailable. Start the backend and retry the update."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  async function handleProductContentSubmit(
    event: React.FormEvent<HTMLFormElement>,
    listing: SellerListingSummary
  ) {
    event.preventDefault();
    const feedbackKey = `product:${listing.productId}`;
    setPendingKey(feedbackKey);
    clearFeedback(feedbackKey);

    const formData = new FormData(event.currentTarget);
    const brandNameRaw = String(formData.get("brandName") ?? "").trim();
    const imageUrlRaw = String(formData.get("imageUrl") ?? "").trim();
    const imageAltRaw = String(formData.get("imageAlt") ?? "").trim();
    const payload = {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      categoryId: String(formData.get("categoryId") ?? "").trim(),
      brandName: brandNameRaw || null,
      imageUrl: imageUrlRaw || null,
      imageAlt: imageAltRaw || null,
      note: String(formData.get("note") ?? "").trim() || undefined
    };

    try {
      const response = await fetch(
        `${sellerApiBaseUrl}/catalog-products/${listing.productId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const responseMessage = await readResponseMessage(response);
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            responseMessage ??
            "The product content update was rejected. Review the catalog fields and try again."
        }));
        return;
      }

      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "Seller-owned product content updated and storefront search refreshed."
      }));

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "The API is unavailable. Start the backend and retry the product update."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  async function handleCommercialSubmit(
    event: React.FormEvent<HTMLFormElement>,
    listing: SellerListingSummary
  ) {
    event.preventDefault();
    const feedbackKey = `listing:${listing.listingId}`;
    setPendingKey(feedbackKey);
    clearFeedback(feedbackKey);

    const formData = new FormData(event.currentTarget);
    const compareAtRaw = String(formData.get("compareAtAmount") ?? "").trim();
    const priceAmount = parseMajorUnitInputToMinor(
      String(formData.get("priceAmount") ?? "").trim()
    );
    const compareAtAmount = compareAtRaw
      ? parseMajorUnitInputToMinor(compareAtRaw)
      : null;

    if (priceAmount === null) {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]: "Enter a valid current price in RON, for example 20 or 20.00."
      }));
      setPendingKey(null);
      return;
    }

    if (compareAtRaw && compareAtAmount === null) {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "Enter a valid compare-at price in RON, for example 30 or 30.00."
      }));
      setPendingKey(null);
      return;
    }

    const payload = {
      priceAmount,
      compareAtAmount,
      isActive: String(formData.get("isActive")) === "true",
      note: String(formData.get("priceNote") ?? "").trim() || undefined
    };

    try {
      const response = await fetch(
        `${sellerApiBaseUrl}/listings/${listing.listingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const responseMessage = await readResponseMessage(response);
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            responseMessage ??
            "Commercial changes were rejected. Verify the pricing values and offer visibility."
        }));
        return;
      }

      setFeedback((current) => ({
        ...current,
        [feedbackKey]: "Pricing and offer visibility synced to the marketplace."
      }));

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "The API is unavailable. Start the backend and retry the pricing update."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  async function handleArchive(listing: SellerListingSummary) {
    const feedbackKey = `archive:${listing.listingId}`;

    if (
      !window.confirm(
        `Archive ${listing.sellerSku}? The offer will be removed from storefront discovery until you create or reactivate a new one.`
      )
    ) {
      return;
    }

    setPendingKey(feedbackKey);
    clearFeedback(feedbackKey);

    try {
      const response = await fetch(
        `${sellerApiBaseUrl}/listings/${listing.listingId}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!response.ok) {
        const responseMessage = await readResponseMessage(response);
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            responseMessage ??
            "The offer could not be archived right now."
        }));
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "The API is unavailable. Start the backend and retry the archive action."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  async function handleReactivate(listing: SellerListingSummary) {
    const feedbackKey = `reactivate:${listing.listingId}`;
    setPendingKey(feedbackKey);
    clearFeedback(feedbackKey);

    try {
      const response = await fetch(
        `${sellerApiBaseUrl}/listings/${listing.listingId}/reactivate`,
        {
          method: "PATCH",
          credentials: "include"
        }
      );

      if (!response.ok) {
        const responseMessage = await readResponseMessage(response);
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            responseMessage ?? "The archived offer could not be reactivated."
        }));
        return;
      }

      setFeedback((current) => ({
        ...current,
        [feedbackKey]: "Offer reactivated and returned to storefront discovery."
      }));

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "The API is unavailable. Start the backend and retry the reactivation."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  async function handleDeleteOwnedProduct(listing: SellerListingSummary) {
    const feedbackKey = `delete:${listing.productId}`;

    if (
      !window.confirm(
        `Delete ${listing.title}? This permanently removes the seller-owned product and all of its offers if no orders, carts, or reservations still depend on it.`
      )
    ) {
      return;
    }

    setPendingKey(feedbackKey);
    clearFeedback(feedbackKey);

    try {
      const response = await fetch(
        `${sellerApiBaseUrl}/catalog-products/${listing.productId}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!response.ok) {
        const responseMessage = await readResponseMessage(response);
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            responseMessage ??
            "The seller-owned product could not be deleted right now."
        }));
        return;
      }

      setFeedback((current) => ({
        ...current,
        [feedbackKey]: "Seller-owned product deleted from the catalog workspace."
      }));

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback((current) => ({
        ...current,
        [feedbackKey]:
          "The API is unavailable. Start the backend and retry the delete action."
      }));
    } finally {
      setPendingKey(null);
    }
  }

  function clearFeedback(feedbackKey: string) {
    setFeedback((current) => {
      const next = { ...current };
      delete next[feedbackKey];
      return next;
    });
  }

  return (
    <div className="grid gap-6">
      <Panel className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Create product
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                Add your own product and publish the first seller offer.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Use this when the product does not already exist on Velora.
                The seller portal will create the catalog record, attach your
                first offer, sync storefront availability, and notify admin
                operations.
              </p>
            </div>
            <div className="rounded-[24px] bg-black/3 px-5 py-4 text-sm text-[var(--muted)]">
              {creationOptions?.categories.length ?? 0} active categor{(creationOptions?.categories.length ?? 0) === 1 ? "y" : "ies"}
            </div>
          </div>
        </div>

        <form
          className="grid gap-5 rounded-[28px] border border-[var(--stroke)] bg-white/80 p-6"
          onSubmit={(event) => void handleCreateCatalogProductSubmit(event)}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Product title
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="title"
                placeholder="Atlas Reader Desk Lamp"
                type="text"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Category
              </span>
              <select
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                disabled={catalogCreationDisabled}
                name="categoryId"
              >
                {(creationOptions?.categories ?? []).map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Brand
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="brandName"
                placeholder="Lumio"
                type="text"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Variant title
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="variantTitle"
                placeholder="Black / USB-C"
                type="text"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-[var(--foreground)]">
              Product description
            </span>
            <textarea
              className="min-h-32 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
              name="description"
              placeholder="Describe the product clearly for storefront discovery, search, and customer trust."
            />
          </label>

          <div className="grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Hero image URL
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="imageUrl"
                placeholder="https://images.example.com/product-hero.jpg"
                type="url"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Image alt text
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="imageAlt"
                placeholder="Atlas Reader Desk Lamp in matte black"
                type="text"
              />
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Seller SKU
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="sellerSku"
                placeholder="LUM-ATLAS-BLK"
                type="text"
              />
              <span className="text-xs leading-6 text-[var(--muted)]">
                Your internal stock code for this offer or variant.
              </span>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Offer visibility
              </span>
              <select
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue="true"
                name="isActive"
              >
                <option value="true">Visible to customers</option>
                <option value="false">Hidden until ready</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            <MoneyField
              label="Current price"
              name="priceAmount"
              previewLabel="Live storefront price"
            />

            <MoneyField
              label="Compare-at price"
              name="compareAtAmount"
              placeholder="Optional"
              previewLabel="Strikethrough reference"
            />

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                On hand
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue={0}
                min={0}
                name="onHand"
                type="number"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Safety stock
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue={0}
                min={0}
                name="safetyStock"
                type="number"
              />
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Lead time
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue={2}
                max={30}
                min={1}
                name="leadTimeDays"
                type="number"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Product note
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="note"
                placeholder="Merchant launch, handcrafted line, exclusive import, or other operator context"
                type="text"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-7 text-[var(--muted)]">
              New seller-created products stay seller-scoped operationally, and
              admin is notified for catalog visibility.
            </p>
            <Button
              disabled={
                catalogCreationDisabled ||
                pendingKey === "create-catalog-product"
              }
              type="submit"
            >
              {pendingKey === "create-catalog-product"
                ? "Creating product..."
                : "Create product and offer"}
            </Button>
          </div>

          {feedback["create-catalog-product"] ? (
            <p className="text-sm text-[var(--muted)]">
              {feedback["create-catalog-product"]}
            </p>
          ) : null}
        </form>
      </Panel>

      <Panel className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Add offer
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                Attach an offer to a product that is already in the Velora catalog.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Sellers attach their own SKU, pricing, stock, and visibility to
                shared marketplace products or to additional variants they own.
                Products created by other sellers stay private to their owning
                merchant and will not appear here.
              </p>
            </div>
            <div className="rounded-[24px] bg-black/3 px-5 py-4 text-sm text-[var(--muted)]">
              {catalogOptions.length} catalog product(s) available
            </div>
          </div>
        </div>

        <form
          className="grid gap-5 rounded-[28px] border border-[var(--stroke)] bg-white/80 p-6"
          onSubmit={(event) => void handleCreateSubmit(event)}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Catalog product
              </span>
              <select
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                disabled={createDisabled}
                name="productId"
                onChange={(event) => {
                  const nextProductId = event.target.value;
                  setSelectedProductId(nextProductId);
                  setSelectedVariantId(
                    resolveDefaultVariantId(
                      catalogOptions.find(
                        (option) => option.productId === nextProductId
                      )
                    )
                  );
                }}
                value={selectedProductId}
              >
                {catalogOptions.map((option) => (
                  <option key={option.productId} value={option.productId}>
                    {option.title}
                    {option.brandName ? ` - ${option.brandName}` : ""}
                    {option.sellerListingCount > 0
                      ? ` (${option.sellerListingCount} existing offer${option.sellerListingCount === 1 ? "" : "s"})`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Variant
              </span>
              <select
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                disabled={!selectedProduct}
                name="variantId"
                onChange={(event) => setSelectedVariantId(event.target.value)}
                value={selectedVariantId}
              >
                {(selectedProduct?.variants ?? []).map((variant) => (
                  <option key={variant.variantId} value={variant.variantId}>
                    {variant.title}
                    {variant.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedProduct ? (
            <div className="rounded-[24px] bg-black/3 px-5 py-4 text-sm text-[var(--muted)]">
              <p className="font-semibold text-[var(--foreground)]">
                {selectedProduct.title}
              </p>
              <p className="mt-2 leading-7">
                {selectedProduct.categoryName ?? "Uncategorized"}
                {selectedProduct.brandName
                  ? ` / ${selectedProduct.brandName}`
                  : ""}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Seller SKU
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="sellerSku"
                placeholder="NST-AX1P-NEW"
                type="text"
              />
              <span className="text-xs leading-6 text-[var(--muted)]">
                Your internal stock code for this catalog offer.
              </span>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Offer visibility
              </span>
              <select
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue="true"
                name="isActive"
              >
                <option value="true">Visible to customers</option>
                <option value="false">Hidden until launch</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            <MoneyField
              label="Current price"
              name="priceAmount"
              previewLabel="Live storefront price"
            />

            <MoneyField
              label="Compare-at price"
              name="compareAtAmount"
              placeholder="Optional"
              previewLabel="Strikethrough reference"
            />

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                On hand
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue={0}
                min={0}
                name="onHand"
                type="number"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Safety stock
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue={0}
                min={0}
                name="safetyStock"
                type="number"
              />
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Lead time
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue={2}
                max={30}
                min={1}
                name="leadTimeDays"
                type="number"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Offer note
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="note"
                placeholder="Launch wave, exclusive color, merchant-specific bundle"
                type="text"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-7 text-[var(--muted)]">
              Platform-wide discounts still stay in the admin pricing console.
            </p>
            <Button disabled={createDisabled || pendingKey === "create"} type="submit">
              {pendingKey === "create" ? "Creating..." : "Create offer"}
            </Button>
          </div>

          {feedback.create ? (
            <p className="text-sm text-[var(--muted)]">{feedback.create}</p>
          ) : null}
        </form>
      </Panel>

      <Panel className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Catalog workspace
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                Manage your catalog and offers from one place.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                This workspace includes both seller-created products and offers
                attached to products that already exist on Velora. Use it for
                product content where you own the catalog record, plus pricing,
                visibility, stock posture, and offer lifecycle actions.
              </p>
            </div>
            <div className="rounded-[24px] bg-black/3 px-5 py-4 text-sm text-[var(--muted)]">
              {listings.length} offer{listings.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {listings.length && selectedListing ? (
          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[28px] border border-[var(--stroke)] bg-white/70">
              {listings.map((listing) => {
                const isSelected = listing.listingId === selectedListing.listingId;

                return (
                  <button
                    key={listing.listingId}
                    className={`grid w-full gap-1 border-b border-[var(--stroke)] px-4 py-4 text-left transition-colors last:border-b-0 ${
                      isSelected
                        ? "bg-[rgba(190,24,52,0.08)]"
                        : "bg-white/80 hover:bg-black/3"
                    }`}
                    onClick={() => setSelectedListingId(listing.listingId)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">
                        {listing.title}
                      </p>
                      <StatusBadge value={listing.status} />
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      {formatListingWorkspaceLabel(listing)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      SKU {listing.sellerSku}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid min-w-0 gap-5">
              <div className="rounded-[28px] border border-[var(--stroke)] bg-white/80 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
                      {selectedListing.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {formatListingWorkspaceLabel(selectedListing)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Internal SKU {selectedListing.sellerSku}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={selectedListing.status} />
                    <StatusBadge
                      value={selectedListing.productOwnership === "SELLER" ? "SELLER" : "PLATFORM"}
                    />
                    <StatusBadge
                      value={selectedListing.isActive ? "VISIBLE" : "HIDDEN"}
                    />
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  <MetricCard
                    label="Price"
                    value={
                      selectedListing.price
                        ? formatMoney(selectedListing.price)
                        : "Unavailable"
                    }
                  />
                  <MetricCard
                    label="On hand"
                    value={selectedListing.inventory.onHand.toString()}
                  />
                  <MetricCard
                    label="Reserved"
                    value={selectedListing.inventory.reserved.toString()}
                  />
                  <MetricCard
                    label="Available"
                    value={selectedListing.inventory.availableQuantity.toString()}
                  />
                </div>
              </div>

              {selectedListing.canEditProductContent ? (
                <form
                  className="grid min-w-0 gap-5 rounded-[28px] border border-[var(--stroke)] bg-white/80 p-6"
                  onSubmit={(event) =>
                    void handleProductContentSubmit(event, selectedListing)
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                        Product content
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        You own this catalog record, so content updates here flow
                        into storefront product pages and search.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={selectedListing.status} />
                      <StatusBadge value="SELLER" />
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <label className="grid min-w-0 gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Product title
                      </span>
                      <input
                        className="min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue={selectedListing.title}
                        name="title"
                        type="text"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Category
                      </span>
                      <select
                        className="min-w-0 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue={selectedListing.categoryId ?? ""}
                        disabled={catalogCreationDisabled}
                        name="categoryId"
                      >
                        {(creationOptions?.categories ?? []).map((category) => (
                          <option
                            key={category.categoryId}
                            value={category.categoryId}
                          >
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <label className="grid min-w-0 gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Brand
                      </span>
                      <input
                        className="min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue={selectedListing.brandName ?? ""}
                        name="brandName"
                        placeholder="Lumio"
                        type="text"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Audit note
                      </span>
                      <input
                        className="min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue=""
                        name="note"
                        placeholder="Why this product content changed"
                        type="text"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <label className="grid min-w-0 gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Hero image URL
                      </span>
                      <input
                        className="min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue={selectedListing.image?.url ?? ""}
                        name="imageUrl"
                        placeholder="https://images.example.com/product-hero.jpg"
                        type="url"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Image alt text
                      </span>
                      <input
                        className="min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue={
                          selectedListing.image?.altText ?? selectedListing.title
                        }
                        name="imageAlt"
                        placeholder="Describe the hero image for accessibility"
                        type="text"
                      />
                    </label>
                  </div>

                  <label className="grid min-w-0 gap-2 text-sm">
                    <span className="font-semibold text-[var(--foreground)]">
                      Product description
                    </span>
                    <textarea
                      className="min-h-32 min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                      defaultValue={selectedListing.productDescription}
                      name="description"
                    />
                  </label>

                  <div className="grid gap-3 border-t border-[var(--stroke)] pt-4">
                    <p className="text-sm leading-7 text-[var(--muted)]">
                      Content changes propagate to this seller-owned product across
                      search and storefront detail pages.
                      {selectedListing.status === "ARCHIVED"
                        ? " This archived seller product can also be deleted if you no longer want to keep it in your catalog."
                        : " Use the offer controls below if you want to archive the listing before deleting it later."}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={pendingKey === `product:${selectedListing.productId}`}
                        type="submit"
                        variant="secondary"
                      >
                        {pendingKey === `product:${selectedListing.productId}`
                          ? "Saving..."
                          : "Update product content"}
                      </Button>
                      {selectedListing.status === "ARCHIVED" ? (
                        <Button
                          className="text-[var(--accent)]"
                          disabled={pendingKey === `delete:${selectedListing.productId}`}
                          onClick={() => void handleDeleteOwnedProduct(selectedListing)}
                          type="button"
                          variant="secondary"
                        >
                          {pendingKey === `delete:${selectedListing.productId}`
                            ? "Deleting..."
                            : "Delete product"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {feedback[`product:${selectedListing.productId}`] ? (
                    <p className="text-sm text-[var(--muted)]">
                      {feedback[`product:${selectedListing.productId}`]}
                    </p>
                  ) : null}
                  {feedback[`delete:${selectedListing.productId}`] ? (
                    <p className="text-sm text-[var(--muted)]">
                      {feedback[`delete:${selectedListing.productId}`]}
                    </p>
                  ) : null}
                </form>
              ) : (
                <div className="rounded-[28px] border border-[var(--stroke)] bg-white/80 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Product content
                  </p>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                    This listing is attached to the shared Velora catalog, so you
                    can manage commercial terms and stock here, but the core
                    product content remains platform-managed.
                  </p>
                </div>
              )}

              <SellerPromotionManager
                promotions={promotions}
                selectedListing={selectedListing}
              />

              <div className="grid gap-5 xl:grid-cols-2">
                <form
                  className="grid gap-4 rounded-[28px] border border-[var(--stroke)] bg-white/70 p-5"
                  onSubmit={(event) => void handleCommercialSubmit(event, selectedListing)}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                      Commercial terms
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Control the customer-facing price, strike-through anchor, and
                      whether this offer remains visible in the storefront.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <MoneyField
                      defaultValue={selectedListing.price?.amount ?? 0}
                      label="Current price"
                      name="priceAmount"
                      previewLabel="Live storefront price"
                    />

                    <MoneyField
                      defaultValue={selectedListing.compareAtPrice?.amount ?? ""}
                      label="Compare-at price"
                      name="compareAtAmount"
                      placeholder="Optional"
                      previewLabel="Strikethrough reference"
                    />

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Offer visibility
                      </span>
                      <select
                        className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue={String(selectedListing.isActive)}
                        name="isActive"
                      >
                        <option value="true">Visible to customers</option>
                        <option value="false">Hidden from storefront</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Pricing note
                      </span>
                      <input
                        className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue=""
                        name="priceNote"
                        placeholder="Campaign adjustment, competitor response, manual repricing"
                        type="text"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 border-t border-[var(--stroke)] pt-4">
                    <p className="max-w-xl text-sm leading-7 text-[var(--muted)]">
                      Hiding removes the offer from search. Archiving closes it
                      out operationally without removing the underlying product.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={pendingKey === `listing:${selectedListing.listingId}`}
                        type="submit"
                        variant="secondary"
                      >
                        {pendingKey === `listing:${selectedListing.listingId}`
                          ? "Saving..."
                          : "Update offer"}
                      </Button>
                      {selectedListing.status === "ARCHIVED" ? (
                        <Button
                          disabled={
                            pendingKey === `reactivate:${selectedListing.listingId}`
                          }
                          onClick={() => void handleReactivate(selectedListing)}
                          type="button"
                          variant="secondary"
                        >
                          {pendingKey === `reactivate:${selectedListing.listingId}`
                            ? "Reactivating..."
                            : "Reactivate offer"}
                        </Button>
                      ) : (
                        <Button
                          className="text-[var(--accent)]"
                          disabled={
                            pendingKey === `archive:${selectedListing.listingId}`
                          }
                          onClick={() => void handleArchive(selectedListing)}
                          type="button"
                          variant="secondary"
                        >
                          {pendingKey === `archive:${selectedListing.listingId}`
                            ? "Archiving..."
                            : "Archive offer"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {feedback[`listing:${selectedListing.listingId}`] ? (
                    <p className="text-sm text-[var(--muted)]">
                      {feedback[`listing:${selectedListing.listingId}`]}
                    </p>
                  ) : null}
                  {feedback[`archive:${selectedListing.listingId}`] ? (
                    <p className="text-sm text-[var(--muted)]">
                      {feedback[`archive:${selectedListing.listingId}`]}
                    </p>
                  ) : null}
                  {feedback[`reactivate:${selectedListing.listingId}`] ? (
                    <p className="text-sm text-[var(--muted)]">
                      {feedback[`reactivate:${selectedListing.listingId}`]}
                    </p>
                  ) : null}
                </form>

                <form
                  className="grid gap-4 rounded-[28px] border border-[var(--stroke)] bg-white/70 p-5"
                  onSubmit={(event) => void handleInventorySubmit(event, selectedListing)}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                      Stock posture
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Keep sellable supply, safety buffers, and lead-time promises
                      aligned with the live reservation engine.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        On hand
                      </span>
                      <input
                        className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue={selectedListing.inventory.onHand}
                        min={selectedListing.inventory.reserved}
                        name="onHand"
                        type="number"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Safety stock
                      </span>
                      <input
                        className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue={selectedListing.inventory.safetyStock}
                        min={0}
                        name="safetyStock"
                        type="number"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Lead time
                      </span>
                      <input
                        className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue={selectedListing.leadTimeDays}
                        max={30}
                        min={1}
                        name="leadTimeDays"
                        type="number"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        Operational note
                      </span>
                      <input
                        className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                        defaultValue=""
                        name="note"
                        placeholder="Cycle count, inbound receipt, manual correction"
                        type="text"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-[var(--muted)]">
                      Reserved units cannot be undercut by manual stock updates.
                    </p>
                    <Button
                      disabled={
                        pendingKey === `inventory:${selectedListing.inventoryItemId}`
                      }
                      type="submit"
                    >
                      {pendingKey === `inventory:${selectedListing.inventoryItemId}`
                        ? "Saving..."
                        : "Update stock"}
                    </Button>
                  </div>

                  {feedback[`inventory:${selectedListing.inventoryItemId}`] ? (
                    <p className="text-sm text-[var(--muted)]">
                      {feedback[`inventory:${selectedListing.inventoryItemId}`]}
                    </p>
                  ) : null}
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[var(--stroke)] bg-white/60 px-6 py-5 text-sm leading-7 text-[var(--muted)]">
            Create your first offer above to unlock pricing, visibility, and
            stock management here.
          </div>
        )}
      </Panel>
    </div>
  );
}

function MetricCard({
  label,
  value
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-[24px] bg-black/3 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 min-w-0 break-words text-2xl font-semibold leading-tight text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function MoneyField({
  defaultValue = "",
  label,
  name,
  placeholder,
  previewLabel
}: {
  defaultValue?: number | string;
  label: string;
  name: string;
  placeholder?: string;
  previewLabel: string;
}): React.JSX.Element {
  const initialValue = formatMajorUnitInput(defaultValue);
  const [rawValue, setRawValue] = useState(initialValue);

  useEffect(() => {
    setRawValue(initialValue);
  }, [initialValue]);

  const preview = formatMajorUnitPreview(rawValue);

  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-[var(--foreground)]">{label}</span>
      <input
        className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
        inputMode="decimal"
        min={0.01}
        name={name}
        onChange={(event) => setRawValue(event.target.value)}
        placeholder={placeholder}
        step={0.01}
        type="number"
        value={rawValue}
      />
      <p className="text-xs leading-6 text-[var(--muted)]">
        {preview
          ? `${previewLabel}: ${preview}`
          : "Enter the amount in RON, for example 20 or 20.00."}
      </p>
    </label>
  );
}

function formatListingWorkspaceLabel(listing: SellerListingSummary): string {
  const scopeLabel =
    listing.productOwnership === "SELLER"
      ? "Seller-created catalog"
      : "Marketplace catalog";
  const categoryLabel = listing.categoryName ?? "Uncategorized";
  const variantLabel = listing.variantTitle ? ` / ${listing.variantTitle}` : "";

  return `${scopeLabel} / ${categoryLabel}${variantLabel}`;
}

function resolveDefaultVariantId(
  option: SellerListingCatalogOption | undefined
): string {
  return (
    option?.variants.find((variant) => variant.isDefault)?.variantId ??
    option?.variants[0]?.variantId ??
    ""
  );
}

function formatMajorUnitPreview(rawValue: string): string | null {
  const parsed = parseMajorUnitInputToMinor(rawValue);

  if (parsed === null) {
    return null;
  }

  return formatMoney({
    amount: parsed,
    currency: "RON"
  });
}

function formatMajorUnitInput(value: number | string): string {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return (value / 100).toFixed(2);
}

function parseMajorUnitInputToMinor(rawValue: string): number | null {
  const normalized = rawValue.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

async function readResponseMessage(response: Response): Promise<string | null> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return payload?.message ?? null;
}
