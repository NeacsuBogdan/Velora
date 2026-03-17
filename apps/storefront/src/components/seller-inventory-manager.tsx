"use client";

import type {
  SellerListingCatalogOption,
  SellerListingSummary
} from "@velora/contracts";
import { Button, Panel } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { formatMoney } from "../lib/formatting";
import { StatusBadge } from "./status-badge";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function SellerInventoryManager({
  catalogOptions,
  listings
}: {
  catalogOptions: SellerListingCatalogOption[];
  listings: SellerListingSummary[];
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

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const feedbackKey = "create";
    setPendingKey(feedbackKey);
    clearFeedback(feedbackKey);

    const formData = new FormData(event.currentTarget);
    const compareAtRaw = String(formData.get("compareAtAmount") ?? "").trim();
    const payload = {
      productId: selectedProductId,
      variantId: selectedVariantId || null,
      sellerSku: String(formData.get("sellerSku") ?? "").trim(),
      leadTimeDays: Number(formData.get("leadTimeDays")),
      priceAmount: Number(formData.get("priceAmount")),
      compareAtAmount: compareAtRaw ? Number(compareAtRaw) : null,
      onHand: Number(formData.get("onHand")),
      safetyStock: Number(formData.get("safetyStock")),
      isActive: String(formData.get("isActive")) === "true",
      note: String(formData.get("note") ?? "").trim() || undefined
    };

    try {
      const response = await fetch(`${apiBaseUrl}/seller/listings`, {
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
        `${apiBaseUrl}/seller/inventory/${listing.inventoryItemId}`,
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
    const payload = {
      priceAmount: Number(formData.get("priceAmount")),
      compareAtAmount: compareAtRaw ? Number(compareAtRaw) : null,
      isActive: String(formData.get("isActive")) === "true",
      note: String(formData.get("priceNote") ?? "").trim() || undefined
    };

    try {
      const response = await fetch(
        `${apiBaseUrl}/seller/listings/${listing.listingId}`,
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
        `${apiBaseUrl}/seller/listings/${listing.listingId}`,
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
            Add offer
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
                Add a new seller offer from the shared marketplace catalog.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Sellers attach their own SKU, pricing, stock, and visibility to
                existing products. Canonical products stay platform-managed,
                while merchant offers stay seller-scoped.
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
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Current price
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                min={1}
                name="priceAmount"
                type="number"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Compare-at price
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                min={1}
                name="compareAtAmount"
                placeholder="Optional"
                type="number"
              />
            </label>

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

      {listings.map((listing) => (
        <Panel key={listing.listingId} className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
                {listing.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                SKU {listing.sellerSku}
                {listing.variantTitle ? ` - ${listing.variantTitle}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge value={listing.status} />
              <StatusBadge value={listing.isActive ? "ACTIVE" : "ARCHIVED"} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <MetricCard
              label="Price"
              value={listing.price ? formatMoney(listing.price) : "Unavailable"}
            />
            <MetricCard
              label="On hand"
              value={listing.inventory.onHand.toString()}
            />
            <MetricCard
              label="Reserved"
              value={listing.inventory.reserved.toString()}
            />
            <MetricCard
              label="Available"
              value={listing.inventory.availableQuantity.toString()}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <form
              className="grid gap-4 rounded-[28px] border border-[var(--stroke)] bg-white/70 p-5"
              onSubmit={(event) => void handleCommercialSubmit(event, listing)}
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

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">
                    Current price
                  </span>
                  <input
                    className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                    defaultValue={listing.price?.amount ?? 0}
                    min={1}
                    name="priceAmount"
                    type="number"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">
                    Compare-at price
                  </span>
                  <input
                    className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                    defaultValue={listing.compareAtPrice?.amount ?? ""}
                    min={1}
                    name="compareAtAmount"
                    placeholder="Optional"
                    type="number"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">
                    Offer visibility
                  </span>
                  <select
                    className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                    defaultValue={String(listing.isActive)}
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={pendingKey === `listing:${listing.listingId}`}
                    type="submit"
                    variant="secondary"
                  >
                    {pendingKey === `listing:${listing.listingId}`
                      ? "Saving..."
                      : "Update offer"}
                  </Button>
                  <Button
                    className="text-[var(--accent)]"
                    disabled={pendingKey === `archive:${listing.listingId}`}
                    onClick={() => void handleArchive(listing)}
                    type="button"
                    variant="secondary"
                  >
                    {pendingKey === `archive:${listing.listingId}`
                      ? "Archiving..."
                      : "Archive offer"}
                  </Button>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  Hiding removes the offer from search. Archiving closes it out
                  operationally.
                </p>
              </div>

              {feedback[`listing:${listing.listingId}`] ? (
                <p className="text-sm text-[var(--muted)]">
                  {feedback[`listing:${listing.listingId}`]}
                </p>
              ) : null}
              {feedback[`archive:${listing.listingId}`] ? (
                <p className="text-sm text-[var(--muted)]">
                  {feedback[`archive:${listing.listingId}`]}
                </p>
              ) : null}
            </form>

            <form
              className="grid gap-4 rounded-[28px] border border-[var(--stroke)] bg-white/70 p-5"
              onSubmit={(event) => void handleInventorySubmit(event, listing)}
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

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">
                    On hand
                  </span>
                  <input
                    className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                    defaultValue={listing.inventory.onHand}
                    min={listing.inventory.reserved}
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
                    defaultValue={listing.inventory.safetyStock}
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
                    defaultValue={listing.leadTimeDays}
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
                  disabled={pendingKey === `inventory:${listing.inventoryItemId}`}
                  type="submit"
                >
                  {pendingKey === `inventory:${listing.inventoryItemId}`
                    ? "Saving..."
                    : "Update stock"}
                </Button>
              </div>

              {feedback[`inventory:${listing.inventoryItemId}`] ? (
                <p className="text-sm text-[var(--muted)]">
                  {feedback[`inventory:${listing.inventoryItemId}`]}
                </p>
              ) : null}
            </form>
          </div>
        </Panel>
      ))}
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
    <div className="rounded-[24px] bg-black/3 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
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

async function readResponseMessage(response: Response): Promise<string | null> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return payload?.message ?? null;
}
