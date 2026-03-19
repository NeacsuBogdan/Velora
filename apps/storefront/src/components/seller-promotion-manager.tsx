"use client";

import type {
  PromotionSummary,
  SellerListingSummary,
  SellerPromotionType
} from "@velora/contracts";
import { Button, Panel } from "@velora/ui";
import { useEffect, useState } from "react";

import { formatMoney } from "../lib/formatting";
import { StatusBadge } from "./status-badge";

const sellerApiBaseUrl = "/api/seller";

type ScopeType = "LISTING" | "CATEGORY";
type CategoryDiscountMode = "PERCENTAGE" | "FIXED_AMOUNT";

type SellerPromotionFormState = {
  name: string;
  description: string;
  type: SellerPromotionType;
  scopeType: ScopeType;
  listingId: string;
  categorySlug: string;
  categoryDiscountMode: CategoryDiscountMode;
  percentage: string;
  amount: string;
  buyQuantity: string;
  getQuantity: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

type CategoryOption = {
  slug: string;
  label: string;
  listingCount: number;
};

const emptyFormState: SellerPromotionFormState = {
  name: "",
  description: "",
  type: "PERCENTAGE",
  scopeType: "LISTING",
  listingId: "",
  categorySlug: "",
  categoryDiscountMode: "PERCENTAGE",
  percentage: "",
  amount: "",
  buyQuantity: "",
  getQuantity: "",
  isActive: true,
  startsAt: "",
  endsAt: ""
};

export function SellerPromotionManager({
  listings,
  promotions
}: {
  listings: SellerListingSummary[];
  promotions: PromotionSummary[];
}): React.JSX.Element {
  const listingOptions = listings
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title));
  const categoryOptions = buildCategoryOptions(listings);
  const [promotionItems, setPromotionItems] = useState(() =>
    sortPromotions(promotions)
  );
  const [mode, setMode] = useState<"create" | "edit">(
    promotions.length ? "edit" : "create"
  );
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(
    promotions[0]?.promotionId ?? null
  );
  const [form, setForm] = useState<SellerPromotionFormState>(() =>
    promotions.length
      ? toFormState(promotions[0] ?? null, listingOptions, categoryOptions)
      : createEmptyForm(listingOptions, categoryOptions)
  );
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextListingOptions = listings
      .slice()
      .sort((left, right) => left.title.localeCompare(right.title));
    const nextCategoryOptions = buildCategoryOptions(listings);
    const nextPromotions = sortPromotions(promotions);
    setPromotionItems(nextPromotions);

    if (mode === "edit") {
      const nextSelectedPromotion =
        nextPromotions.find(
          (promotion) => promotion.promotionId === selectedPromotionId
        ) ??
        nextPromotions[0] ??
        null;

      if (!nextSelectedPromotion) {
        setMode("create");
        setSelectedPromotionId(null);
        setForm(createEmptyForm(nextListingOptions, nextCategoryOptions));
        return;
      }

      setSelectedPromotionId(nextSelectedPromotion.promotionId);
      setForm(
        toFormState(nextSelectedPromotion, nextListingOptions, nextCategoryOptions)
      );
      return;
    }

    setForm((current) =>
      stabilizeDraftForm(current, nextListingOptions, nextCategoryOptions)
    );
  }, [listings, mode, promotions, selectedPromotionId]);

  const selectedPromotion =
    promotionItems.find(
      (promotion) => promotion.promotionId === selectedPromotionId
    ) ?? null;
  const selectedListing =
    listingOptions.find((listing) => listing.listingId === form.listingId) ?? null;
  const selectedCategory =
    categoryOptions.find((category) => category.slug === form.categorySlug) ?? null;

  function setField<Key extends keyof SellerPromotionFormState>(
    key: Key,
    value: SellerPromotionFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleTypeChange(nextType: SellerPromotionType) {
    setForm((current) => {
      if (nextType === "CATEGORY_DISCOUNT") {
        return {
          ...current,
          type: nextType,
          scopeType: "CATEGORY",
          listingId: "",
          categorySlug: current.categorySlug || categoryOptions[0]?.slug || "",
          buyQuantity: "",
          getQuantity: ""
        };
      }

      return {
        ...current,
        type: nextType,
        buyQuantity: nextType === "BUY_X_GET_Y" ? current.buyQuantity || "2" : "",
        getQuantity: nextType === "BUY_X_GET_Y" ? current.getQuantity || "1" : ""
      };
    });
  }

  function handleScopeChange(nextScopeType: ScopeType) {
    setForm((current) => ({
      ...current,
      scopeType: nextScopeType,
      listingId:
        nextScopeType === "LISTING"
          ? current.listingId || listingOptions[0]?.listingId || ""
          : "",
      categorySlug:
        nextScopeType === "CATEGORY"
          ? current.categorySlug || categoryOptions[0]?.slug || ""
          : ""
    }));
  }

  function handleCreateNew() {
    setMode("create");
    setSelectedPromotionId(null);
    setForm(createEmptyForm(listingOptions, categoryOptions));
    setMessage(null);
    setErrorMessage(null);
  }

  function handleSelectPromotion(promotion: PromotionSummary) {
    setMode("edit");
    setSelectedPromotionId(promotion.promotionId);
    setForm(toFormState(promotion, listingOptions, categoryOptions));
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);
    setErrorMessage(null);

    const payload = buildPayload(form);

    if (!payload) {
      setErrorMessage(buildValidationMessage(form));
      setIsPending(false);
      return;
    }

    try {
      const response = await fetch(
        mode === "edit" && selectedPromotionId
          ? `${sellerApiBaseUrl}/promotions/${selectedPromotionId}`
          : `${sellerApiBaseUrl}/promotions`,
        {
          method: mode === "edit" && selectedPromotionId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        setErrorMessage(
          (await readResponseMessage(response)) ??
            "The seller campaign could not be saved. Review the target scope, values, and dates."
        );
        return;
      }

      const savedPromotion = (await response.json()) as PromotionSummary;
      const nextPromotions = sortPromotions([
        savedPromotion,
        ...promotionItems.filter(
          (promotion) => promotion.promotionId !== savedPromotion.promotionId
        )
      ]);

      setPromotionItems(nextPromotions);
      setMode("edit");
      setSelectedPromotionId(savedPromotion.promotionId);
      setForm(toFormState(savedPromotion, listingOptions, categoryOptions));
      setMessage(
        mode === "edit" ? "Seller-funded campaign updated." : "Seller-funded campaign created."
      );
    } catch {
      setErrorMessage(
        "The API is unavailable. Start the backend and retry the seller campaign update."
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!selectedPromotionId) {
      return;
    }

    if (
      !window.confirm(
        "Delete this seller-funded campaign? Historical order discounts stay intact, but the promotion will stop applying."
      )
    ) {
      return;
    }

    setIsPending(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${sellerApiBaseUrl}/promotions/${selectedPromotionId}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!response.ok) {
        setErrorMessage(
          (await readResponseMessage(response)) ??
            "The seller campaign could not be deleted."
        );
        return;
      }

      setPromotionItems((current) =>
        current.filter((promotion) => promotion.promotionId !== selectedPromotionId)
      );
      setMode("create");
      setSelectedPromotionId(null);
      setForm(createEmptyForm(listingOptions, categoryOptions));
      setMessage("Seller-funded campaign deleted.");
    } catch {
      setErrorMessage(
        "The API is unavailable. Start the backend and retry the delete action."
      );
    } finally {
      setIsPending(false);
    }
  }

  const activeCampaignCount = promotionItems.filter((promotion) => promotion.isActive)
    .length;
  const promotedOfferCount = new Set(
    promotionItems.flatMap((promotion) => promotion.rules[0]?.configuration.listingIds ?? [])
  ).size;
  const promotedCategoryCount = new Set(
    promotionItems.flatMap(
      (promotion) => promotion.rules[0]?.configuration.categorySlugs ?? []
    )
  ).size;
  const previewValue = describePreviewValue(form, selectedListing, selectedCategory);

  return (
    <div className="grid gap-6">
      <Panel className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Seller promotions
            </p>
            <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              Run seller-funded campaigns from a dedicated control plane.
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">
              Merchants can manage discounts on their own offers and category
              footprint here without mixing campaign work into stock or product
              maintenance.
            </p>
          </div>
          <Button onClick={handleCreateNew} type="button" variant="secondary">
            New campaign
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <MetricTile label="Active campaigns" value={String(activeCampaignCount)} />
          <MetricTile label="Promoted offers" value={String(promotedOfferCount)} />
          <MetricTile
            label="Promoted categories"
            value={String(promotedCategoryCount)}
          />
          <MetricTile label="Funding" value="Seller funded" />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.4fr)]">
        <Panel className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Campaign library
            </p>
            <p className="text-sm leading-7 text-[var(--muted)]">
              Select an existing seller campaign or start a new one.
            </p>
          </div>

          {promotionItems.length ? (
            <div className="grid max-h-[720px] gap-2 overflow-y-auto pr-1">
              {promotionItems.map((promotion) => {
                const isSelected =
                  mode === "edit" &&
                  promotion.promotionId === selectedPromotionId;

                return (
                  <button
                    key={promotion.promotionId}
                    className={`grid gap-3 rounded-[24px] border px-4 py-4 text-left transition ${
                      isSelected
                        ? "border-[var(--accent)] bg-[rgba(218,41,28,0.06)]"
                        : "border-[var(--stroke)] bg-white hover:border-[var(--foreground)]/30"
                    }`}
                    onClick={() => handleSelectPromotion(promotion)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-[var(--foreground)]">
                        {promotion.name}
                      </strong>
                      <StatusBadge
                        value={promotion.isActive ? "ACTIVE" : "PAUSED"}
                      />
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {promotion.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {describePromotionTarget(promotion, listingOptions, categoryOptions)}
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {describePromotionValue(promotion)}
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {formatPromotionWindow(promotion)}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[var(--stroke)] bg-white/70 px-4 py-5 text-sm leading-7 text-[var(--muted)]">
              No seller-funded campaigns exist yet. Create the first one from the
              workspace on the right.
            </div>
          )}
        </Panel>

        <Panel className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-3">
            <MetricTile
              label={form.scopeType === "LISTING" ? "Target offer" : "Target category"}
              value={
                form.scopeType === "LISTING"
                  ? selectedListing?.title ?? "Select an offer"
                  : selectedCategory?.label ?? "Select a category"
              }
            />
            <MetricTile label="Customer effect" value={previewValue} />
            <MetricTile
              label="Campaign status"
              value={form.isActive ? "Active" : "Paused"}
            />
          </div>

          <form className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="grid gap-4 xl:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
                <span className="font-semibold text-[var(--foreground)]">
                  Campaign name
                </span>
                <input
                  className="min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                  onChange={(event) => setField("name", event.target.value)}
                  placeholder="Weekend merchant markdown"
                  type="text"
                  value={form.name}
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
                <span className="font-semibold text-[var(--foreground)]">
                  Campaign description
                </span>
                <textarea
                  className="min-h-28 min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                  onChange={(event) => setField("description", event.target.value)}
                  placeholder="Short merchant-side context for the campaign."
                  value={form.description}
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm">
                <span className="font-semibold text-[var(--foreground)]">
                  Campaign type
                </span>
                <select
                  className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                  onChange={(event) =>
                    handleTypeChange(event.target.value as SellerPromotionType)
                  }
                  value={form.type}
                >
                  <option value="PERCENTAGE">Percentage off</option>
                  <option value="FIXED_AMOUNT">Fixed amount off</option>
                  <option value="CATEGORY_DISCOUNT">Category markdown</option>
                  <option value="BUY_X_GET_Y">Buy X get Y</option>
                </select>
              </label>

              <label className="grid min-w-0 gap-2 text-sm">
                <span className="font-semibold text-[var(--foreground)]">
                  Campaign status
                </span>
                <select
                  className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                  onChange={(event) =>
                    setField("isActive", event.target.value === "true")
                  }
                  value={String(form.isActive)}
                >
                  <option value="true">Active</option>
                  <option value="false">Paused</option>
                </select>
              </label>

              {form.type !== "CATEGORY_DISCOUNT" ? (
                <label className="grid min-w-0 gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">
                    Scope
                  </span>
                  <select
                    className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                    onChange={(event) =>
                      handleScopeChange(event.target.value as ScopeType)
                    }
                    value={form.scopeType}
                  >
                    <option value="LISTING">Specific offer</option>
                    <option value="CATEGORY">Category in my catalog</option>
                  </select>
                </label>
              ) : null}

              {form.scopeType === "LISTING" && form.type !== "CATEGORY_DISCOUNT" ? (
                <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
                  <span className="font-semibold text-[var(--foreground)]">
                    Offer target
                  </span>
                  <select
                    className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                    onChange={(event) => setField("listingId", event.target.value)}
                    value={form.listingId}
                  >
                    {listingOptions.map((listing) => (
                      <option key={listing.listingId} value={listing.listingId}>
                        {listing.title} · {listing.sellerSku}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {form.scopeType === "CATEGORY" || form.type === "CATEGORY_DISCOUNT" ? (
                <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
                  <span className="font-semibold text-[var(--foreground)]">
                    Category target
                  </span>
                  <select
                    className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                    onChange={(event) => setField("categorySlug", event.target.value)}
                    value={form.categorySlug}
                  >
                    {categoryOptions.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.label} · {category.listingCount} offer(s)
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {form.type === "CATEGORY_DISCOUNT" ? (
                <label className="grid min-w-0 gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">
                    Discount mode
                  </span>
                  <select
                    className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                    onChange={(event) =>
                      setField(
                        "categoryDiscountMode",
                        event.target.value as CategoryDiscountMode
                      )
                    }
                    value={form.categoryDiscountMode}
                  >
                    <option value="PERCENTAGE">Percentage off</option>
                    <option value="FIXED_AMOUNT">Fixed amount off</option>
                  </select>
                </label>
              ) : null}

              {(form.type === "PERCENTAGE" ||
                (form.type === "CATEGORY_DISCOUNT" &&
                  form.categoryDiscountMode === "PERCENTAGE")) ? (
                <label className="grid min-w-0 gap-2 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">
                    Percentage off
                  </span>
                  <input
                    className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                    inputMode="decimal"
                    max={100}
                    min={0.01}
                    onChange={(event) => setField("percentage", event.target.value)}
                    placeholder="10"
                    step={0.1}
                    type="number"
                    value={form.percentage}
                  />
                </label>
              ) : null}

              {(form.type === "FIXED_AMOUNT" ||
                (form.type === "CATEGORY_DISCOUNT" &&
                  form.categoryDiscountMode === "FIXED_AMOUNT")) ? (
                <MoneyField
                  label="Fixed discount"
                  onChange={(value) => setField("amount", value)}
                  placeholder="20.00"
                  previewLabel="Discount preview"
                  value={form.amount}
                />
              ) : null}

              {form.type === "BUY_X_GET_Y" ? (
                <>
                  <label className="grid min-w-0 gap-2 text-sm">
                    <span className="font-semibold text-[var(--foreground)]">
                      Buy quantity
                    </span>
                    <input
                      className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                      min={1}
                      onChange={(event) => setField("buyQuantity", event.target.value)}
                      step={1}
                      type="number"
                      value={form.buyQuantity}
                    />
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm">
                    <span className="font-semibold text-[var(--foreground)]">
                      Reward quantity
                    </span>
                    <input
                      className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                      min={1}
                      onChange={(event) => setField("getQuantity", event.target.value)}
                      step={1}
                      type="number"
                      value={form.getQuantity}
                    />
                  </label>
                </>
              ) : null}
            </div>

            <div className="grid gap-4 2xl:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm">
                <span className="font-semibold text-[var(--foreground)]">
                  Starts at
                </span>
                <input
                  className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                  onChange={(event) => setField("startsAt", event.target.value)}
                  type="datetime-local"
                  value={form.startsAt}
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm">
                <span className="font-semibold text-[var(--foreground)]">
                  Ends at
                </span>
                <input
                  className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                  onChange={(event) => setField("endsAt", event.target.value)}
                  type="datetime-local"
                  value={form.endsAt}
                />
              </label>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-[var(--stroke)] bg-black/3 px-4 py-4 text-sm leading-7 text-[var(--muted)]">
              <p>
                This console is limited to seller-funded campaigns. Customer-facing
                price changes reduce the seller payout on affected orders, while
                platform-funded and shared campaigns stay under admin control.
              </p>
              {form.scopeType === "CATEGORY" || form.type === "CATEGORY_DISCOUNT" ? (
                <p>
                  Category campaigns apply only to this merchant&apos;s own offers in
                  the selected category path.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button disabled={isPending} type="submit" variant="secondary">
                {isPending
                  ? "Saving..."
                  : mode === "edit"
                    ? "Update campaign"
                    : "Create campaign"}
              </Button>
              {mode === "edit" && selectedPromotion ? (
                <Button
                  className="text-[var(--accent)]"
                  disabled={isPending}
                  onClick={() => void handleDelete()}
                  type="button"
                  variant="secondary"
                >
                  {isPending ? "Deleting..." : "Delete campaign"}
                </Button>
              ) : null}
            </div>

            {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
            {errorMessage ? (
              <p className="text-sm text-[var(--accent)]">{errorMessage}</p>
            ) : null}
          </form>
        </Panel>
      </div>
    </div>
  );
}

function MetricTile({
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
      <p className="mt-3 text-xl font-semibold leading-tight text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function MoneyField({
  label,
  onChange,
  placeholder,
  previewLabel,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  previewLabel: string;
  value: string;
}) {
  const preview = formatMajorUnitPreview(value);

  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-semibold text-[var(--foreground)]">{label}</span>
      <input
        className="w-full min-w-0 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
        inputMode="decimal"
        min={0.01}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={0.01}
        type="number"
        value={value}
      />
      <p className="text-xs leading-6 text-[var(--muted)]">
        {preview
          ? `${previewLabel}: ${preview}`
          : "Enter the amount in RON, for example 20 or 20.00."}
      </p>
    </label>
  );
}

function buildCategoryOptions(listings: SellerListingSummary[]) {
  const categoryMap = new Map<string, CategoryOption>();

  for (const listing of listings) {
    if (!listing.categorySlug || !listing.categoryName) {
      continue;
    }

    const existingCategory = categoryMap.get(listing.categorySlug);

    if (existingCategory) {
      existingCategory.listingCount += 1;
      continue;
    }

    categoryMap.set(listing.categorySlug, {
      slug: listing.categorySlug,
      label: listing.categoryName,
      listingCount: 1
    });
  }

  return [...categoryMap.values()].sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}

function createEmptyForm(
  listings: SellerListingSummary[],
  categoryOptions: CategoryOption[]
): SellerPromotionFormState {
  return {
    ...emptyFormState,
    listingId: listings[0]?.listingId ?? "",
    categorySlug: categoryOptions[0]?.slug ?? ""
  };
}

function stabilizeDraftForm(
  current: SellerPromotionFormState,
  listings: SellerListingSummary[],
  categoryOptions: CategoryOption[]
) {
  return {
    ...current,
    listingId:
      current.listingId && listings.some((listing) => listing.listingId === current.listingId)
        ? current.listingId
        : listings[0]?.listingId ?? "",
    categorySlug:
      current.categorySlug &&
      categoryOptions.some((category) => category.slug === current.categorySlug)
        ? current.categorySlug
        : categoryOptions[0]?.slug ?? ""
  };
}

function toFormState(
  promotion: PromotionSummary | null,
  listings: SellerListingSummary[],
  categoryOptions: CategoryOption[]
): SellerPromotionFormState {
  if (!promotion) {
    return createEmptyForm(listings, categoryOptions);
  }

  const configuration = promotion.rules[0]?.configuration;
  const type = promotion.type as SellerPromotionType;

  return {
    name: promotion.name,
    description: promotion.description,
    type,
    scopeType:
      type === "CATEGORY_DISCOUNT" ||
      (configuration?.categorySlugs?.length ?? 0) > 0
        ? "CATEGORY"
        : "LISTING",
    listingId: configuration?.listingIds?.[0] ?? listings[0]?.listingId ?? "",
    categorySlug:
      configuration?.categorySlugs?.[0] ?? categoryOptions[0]?.slug ?? "",
    categoryDiscountMode:
      type === "CATEGORY_DISCOUNT" && configuration?.amount !== undefined
        ? "FIXED_AMOUNT"
        : "PERCENTAGE",
    percentage:
      configuration?.percentage !== undefined
        ? String(configuration.percentage)
        : "",
    amount:
      configuration?.amount !== undefined
        ? formatMajorUnitInput(configuration.amount)
        : "",
    buyQuantity:
      configuration?.buyQuantity !== undefined
        ? String(configuration.buyQuantity)
        : "",
    getQuantity:
      configuration?.getQuantity !== undefined
        ? String(configuration.getQuantity)
        : "",
    isActive: promotion.isActive,
    startsAt: toLocalDateTime(promotion.startsAt),
    endsAt: toLocalDateTime(promotion.endsAt)
  };
}

function buildPayload(form: SellerPromotionFormState) {
  const payload = {
    name: form.name.trim(),
    description: form.description.trim(),
    type: form.type,
    listingId:
      form.scopeType === "LISTING" && form.type !== "CATEGORY_DISCOUNT"
        ? form.listingId || null
        : null,
    categorySlug:
      form.scopeType === "CATEGORY" || form.type === "CATEGORY_DISCOUNT"
        ? form.categorySlug || null
        : null,
    percentage:
      form.type === "PERCENTAGE" ||
      (form.type === "CATEGORY_DISCOUNT" &&
        form.categoryDiscountMode === "PERCENTAGE")
        ? parseOptionalNumber(form.percentage)
        : undefined,
    amount:
      form.type === "FIXED_AMOUNT" ||
      (form.type === "CATEGORY_DISCOUNT" &&
        form.categoryDiscountMode === "FIXED_AMOUNT")
        ? parseMajorUnitInputToMinor(form.amount) ?? undefined
        : undefined,
    buyQuantity:
      form.type === "BUY_X_GET_Y" ? parseOptionalInteger(form.buyQuantity) : undefined,
    getQuantity:
      form.type === "BUY_X_GET_Y" ? parseOptionalInteger(form.getQuantity) : undefined,
    isActive: form.isActive,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null
  };

  if (!payload.name || !payload.description) {
    return null;
  }

  if (payload.listingId === null && payload.categorySlug === null) {
    return null;
  }

  if (form.type === "PERCENTAGE" && payload.percentage === undefined) {
    return null;
  }

  if (form.type === "FIXED_AMOUNT" && payload.amount === undefined) {
    return null;
  }

  if (
    form.type === "CATEGORY_DISCOUNT" &&
    payload.amount === undefined &&
    payload.percentage === undefined
  ) {
    return null;
  }

  if (
    form.type === "BUY_X_GET_Y" &&
    (payload.buyQuantity === undefined || payload.getQuantity === undefined)
  ) {
    return null;
  }

  return payload;
}

function buildValidationMessage(form: SellerPromotionFormState) {
  if (!form.name.trim() || !form.description.trim()) {
    return "Add a campaign name and description before saving.";
  }

  if (form.type === "PERCENTAGE" && parseOptionalNumber(form.percentage) === undefined) {
    return "Enter a valid percentage between 0 and 100.";
  }

  if (
    form.type === "FIXED_AMOUNT" &&
    parseMajorUnitInputToMinor(form.amount) === null
  ) {
    return "Enter a valid fixed discount in RON, for example 20 or 20.00.";
  }

  if (
    form.type === "CATEGORY_DISCOUNT" &&
    form.categoryDiscountMode === "PERCENTAGE" &&
    parseOptionalNumber(form.percentage) === undefined
  ) {
    return "Enter a valid category percentage discount.";
  }

  if (
    form.type === "CATEGORY_DISCOUNT" &&
    form.categoryDiscountMode === "FIXED_AMOUNT" &&
    parseMajorUnitInputToMinor(form.amount) === null
  ) {
    return "Enter a valid category fixed discount in RON.";
  }

  if (
    form.type === "BUY_X_GET_Y" &&
    (parseOptionalInteger(form.buyQuantity) === undefined ||
      parseOptionalInteger(form.getQuantity) === undefined)
  ) {
    return "Buy X get Y campaigns require both buy and reward quantities.";
  }

  return "Review the target scope, discount values, and active dates.";
}

function describePromotionTarget(
  promotion: PromotionSummary,
  listings: SellerListingSummary[],
  categoryOptions: CategoryOption[]
) {
  const configuration = promotion.rules[0]?.configuration;
  const listingId = configuration?.listingIds?.[0];

  if (listingId) {
    const listing = listings.find((item) => item.listingId === listingId);
    return listing
      ? `Offer · ${listing.title} · ${listing.sellerSku}`
      : "Offer-scoped campaign";
  }

  const categorySlug = configuration?.categorySlugs?.[0];
  const category = categoryOptions.find((item) => item.slug === categorySlug);

  return category
    ? `Category · ${category.label}`
    : "Category-scoped campaign";
}

function describePromotionValue(promotion: PromotionSummary) {
  const configuration = promotion.rules[0]?.configuration;

  if (
    (promotion.type === "PERCENTAGE" || promotion.type === "CATEGORY_DISCOUNT") &&
    configuration?.percentage !== undefined
  ) {
    return `${configuration.percentage}% off`;
  }

  if (
    (promotion.type === "FIXED_AMOUNT" ||
      promotion.type === "CATEGORY_DISCOUNT") &&
    configuration?.amount !== undefined
  ) {
    return `${formatMoney({
      amount: configuration.amount,
      currency: "RON"
    })} off`;
  }

  if (
    promotion.type === "BUY_X_GET_Y" &&
    configuration?.buyQuantity !== undefined &&
    configuration?.getQuantity !== undefined
  ) {
    return `Buy ${configuration.buyQuantity}, get ${configuration.getQuantity}`;
  }

  return promotion.type.replace(/_/g, " ");
}

function describePreviewValue(
  form: SellerPromotionFormState,
  selectedListing: SellerListingSummary | null,
  selectedCategory: CategoryOption | null
) {
  if (form.type === "BUY_X_GET_Y") {
    const buyQuantity = parseOptionalInteger(form.buyQuantity) ?? 0;
    const getQuantity = parseOptionalInteger(form.getQuantity) ?? 0;

    return buyQuantity > 0 && getQuantity > 0
      ? `Buy ${buyQuantity}, get ${getQuantity}`
      : "Set bundle quantities";
  }

  if (form.scopeType === "CATEGORY" || form.type === "CATEGORY_DISCOUNT") {
    return selectedCategory
      ? `${selectedCategory.listingCount} offer(s) affected`
      : "Select a category";
  }

  if (!selectedListing?.price) {
    return "Set price first";
  }

  return formatMoney({
    amount: calculateExpectedPromotionalPrice(selectedListing.price.amount, form),
    currency: selectedListing.price.currency
  });
}

function calculateExpectedPromotionalPrice(
  basePriceAmount: number,
  form: SellerPromotionFormState
) {
  const usePercentage =
    form.type === "PERCENTAGE" ||
    (form.type === "CATEGORY_DISCOUNT" &&
      form.categoryDiscountMode === "PERCENTAGE");

  if (usePercentage) {
    const percentage = parseOptionalNumber(form.percentage);

    if (percentage === undefined) {
      return basePriceAmount;
    }

    return Math.max(
      basePriceAmount - Math.round(basePriceAmount * (percentage / 100)),
      0
    );
  }

  const amount = parseMajorUnitInputToMinor(form.amount);

  if (amount === null) {
    return basePriceAmount;
  }

  return Math.max(basePriceAmount - amount, 0);
}

function sortPromotions(promotions: PromotionSummary[]) {
  return promotions
    .slice()
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
}

function formatPromotionWindow(promotion: PromotionSummary) {
  const startsAt = promotion.startsAt
    ? new Date(promotion.startsAt).toLocaleDateString("en-GB")
    : "now";
  const endsAt = promotion.endsAt
    ? new Date(promotion.endsAt).toLocaleDateString("en-GB")
    : "until removed";

  return `${startsAt} - ${endsAt}`;
}

function toLocalDateTime(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

function formatMajorUnitInput(value: number) {
  return (value / 100).toFixed(2);
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

function parseOptionalNumber(rawValue: string) {
  const normalized = rawValue.trim();

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOptionalInteger(rawValue: string) {
  const normalized = rawValue.trim();

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function readResponseMessage(response: Response): Promise<string | null> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return payload?.message ?? null;
}
