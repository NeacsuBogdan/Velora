"use client";

import type { SellerListingSummary } from "@velora/contracts";
import { Button, Panel } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { formatMoney } from "../lib/formatting";
import { StatusBadge } from "./status-badge";

export function SellerInventoryManager({
  listings
}: {
  listings: SellerListingSummary[];
}): React.JSX.Element {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  async function handleInventorySubmit(
    event: React.FormEvent<HTMLFormElement>,
    listing: SellerListingSummary
  ) {
    event.preventDefault();
    const feedbackKey = `inventory:${listing.inventoryItemId}`;
    setPendingKey(feedbackKey);
    setFeedback((current) => {
      const next = { ...current };
      delete next[feedbackKey];
      return next;
    });

    const formData = new FormData(event.currentTarget);
    const payload = {
      onHand: Number(formData.get("onHand")),
      safetyStock: Number(formData.get("safetyStock")),
      leadTimeDays: Number(formData.get("leadTimeDays")),
      note: String(formData.get("note") ?? "").trim() || undefined
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/seller/inventory/${listing.inventoryItemId}`,
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
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            "The update was rejected. Review reserved stock and try again."
        }));
        setPendingKey(null);
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
    setFeedback((current) => {
      const next = { ...current };
      delete next[feedbackKey];
      return next;
    });

    const formData = new FormData(event.currentTarget);
    const priceAmount = Number(formData.get("priceAmount"));
    const compareAtRaw = String(formData.get("compareAtAmount") ?? "").trim();
    const payload = {
      priceAmount,
      compareAtAmount: compareAtRaw ? Number(compareAtRaw) : null,
      isActive: String(formData.get("isActive")) === "true",
      note: String(formData.get("priceNote") ?? "").trim() || undefined
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/seller/listings/${listing.listingId}`,
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
        setFeedback((current) => ({
          ...current,
          [feedbackKey]:
            "Commercial changes were rejected. Verify the pricing values and offer visibility."
        }));
        setPendingKey(null);
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

  return (
    <div className="grid gap-4">
      {listings.map((listing) => (
        <Panel key={listing.listingId}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
                {listing.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                SKU {listing.sellerSku}
                {listing.variantTitle ? ` · ${listing.variantTitle}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge value={listing.status} />
              <StatusBadge value={listing.isActive ? "ACTIVE" : "ARCHIVED"} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] bg-black/3 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Price
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                {listing.price ? formatMoney(listing.price) : "Unavailable"}
              </p>
            </div>
            <div className="rounded-[24px] bg-black/3 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                On hand
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                {listing.inventory.onHand}
              </p>
            </div>
            <div className="rounded-[24px] bg-black/3 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Reserved
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                {listing.inventory.reserved}
              </p>
            </div>
            <div className="rounded-[24px] bg-black/3 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Available
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                {listing.inventory.availableQuantity}
              </p>
            </div>
          </div>

          <form
            className="mt-6 grid gap-4 rounded-[28px] border border-[var(--stroke)] bg-white/70 p-5 lg:grid-cols-[repeat(2,minmax(0,1fr))_220px_minmax(0,1.2fr)_auto]"
            onSubmit={(event) => void handleCommercialSubmit(event, listing)}
          >
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">Current price</span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue={listing.price?.amount ?? 0}
                min={1}
                name="priceAmount"
                type="number"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">Compare-at price</span>
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
              <span className="font-semibold text-[var(--foreground)]">Offer visibility</span>
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
              <span className="font-semibold text-[var(--foreground)]">Pricing note</span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue=""
                name="priceNote"
                placeholder="Campaign adjustment, competitor response, manual repricing"
                type="text"
              />
            </label>

            <div className="flex items-end">
              <Button disabled={pendingKey === `listing:${listing.listingId}`} type="submit" variant="secondary">
                {pendingKey === `listing:${listing.listingId}`
                  ? "Saving..."
                  : "Update offer"}
              </Button>
            </div>
          </form>

          <form
            className="mt-6 grid gap-4 rounded-[28px] border border-[var(--stroke)] bg-white/70 p-5 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)_auto]"
            onSubmit={(event) => void handleInventorySubmit(event, listing)}
          >
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">On hand</span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue={listing.inventory.onHand}
                min={listing.inventory.reserved}
                name="onHand"
                type="number"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">Safety stock</span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue={listing.inventory.safetyStock}
                min={0}
                name="safetyStock"
                type="number"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">Lead time</span>
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
              <span className="font-semibold text-[var(--foreground)]">Operational note</span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                defaultValue=""
                name="note"
                placeholder="Cycle count, inbound receipt, manual correction"
                type="text"
              />
            </label>

            <div className="flex items-end">
              <Button disabled={pendingKey === `inventory:${listing.inventoryItemId}`} type="submit">
                {pendingKey === `inventory:${listing.inventoryItemId}` ? "Saving..." : "Update stock"}
              </Button>
            </div>
          </form>

          {feedback[`listing:${listing.listingId}`] ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              {feedback[`listing:${listing.listingId}`]}
            </p>
          ) : null}
          {feedback[`inventory:${listing.inventoryItemId}`] ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              {feedback[`inventory:${listing.inventoryItemId}`]}
            </p>
          ) : null}
        </Panel>
      ))}
    </div>
  );
}
