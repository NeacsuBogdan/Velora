"use client";

import type {
  AdminCatalogOptions,
  AdminProductSummary,
  CouponStatus,
  PromotionFundingSource,
  PromotionStackingMode,
  PromotionSummary,
  PromotionType
} from "@velora/contracts";
import { Button, Panel } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { apiUrl } from "../lib/api-url";
import { ListScrollClassName } from "./admin-primitives";

const promotionTypes: PromotionType[] = [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "CART_THRESHOLD",
  "CATEGORY_DISCOUNT",
  "BUY_X_GET_Y"
];

const stackingModes: PromotionStackingMode[] = ["STACKABLE", "EXCLUSIVE"];
const couponStatuses: CouponStatus[] = ["ACTIVE", "DISABLED", "EXPIRED"];
const fundingSources: PromotionFundingSource[] = ["PLATFORM", "SELLER", "SHARED"];

interface PromotionConsoleProps {
  initialPromotions: PromotionSummary[];
  initialProducts: AdminProductSummary[];
  catalogOptions: AdminCatalogOptions;
}

interface PromotionFormState {
  name: string;
  code: string;
  description: string;
  type: PromotionType;
  fundingSource: PromotionFundingSource;
  sellerFundingSharePercent: string;
  stackingMode: PromotionStackingMode;
  priority: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  ruleName: string;
  percentage: string;
  amount: string;
  thresholdAmount: string;
  categorySlugs: string[];
  listingIds: string[];
  buyQuantity: string;
  getQuantity: string;
  couponCode: string;
  couponStatus: CouponStatus;
  couponUsageLimit: string;
  couponStartsAt: string;
  couponEndsAt: string;
}

const emptyFormState: PromotionFormState = {
  name: "",
  code: "",
  description: "",
  type: "PERCENTAGE",
  fundingSource: "PLATFORM",
  sellerFundingSharePercent: "",
  stackingMode: "STACKABLE",
  priority: "100",
  isActive: true,
  startsAt: "",
  endsAt: "",
  ruleName: "",
  percentage: "",
  amount: "",
  thresholdAmount: "",
  categorySlugs: [],
  listingIds: [],
  buyQuantity: "",
  getQuantity: "",
  couponCode: "",
  couponStatus: "ACTIVE",
  couponUsageLimit: "",
  couponStartsAt: "",
  couponEndsAt: ""
};

function toLocalDateTime(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

function formatMinorAmount(value: number | undefined) {
  return value === undefined ? "" : (value / 100).toFixed(2);
}

function parseOptionalInteger(value: string) {
  return value.trim().length > 0 ? Number(value) : undefined;
}

function parseOptionalDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function parseOptionalCurrency(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const normalized = Number(trimmed.replace(",", "."));
  return Number.isFinite(normalized) ? Math.round(normalized * 100) : undefined;
}

function formatMoney(amount: number, currency = "RON") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount / 100);
}

function toFormState(promotion: PromotionSummary | null): PromotionFormState {
  if (!promotion) {
    return emptyFormState;
  }

  const rule = promotion.rules[0];
  const coupon = promotion.coupons[0];

  return {
    name: promotion.name,
    code: promotion.code ?? "",
    description: promotion.description,
    type: promotion.type,
    fundingSource: promotion.fundingSource,
    sellerFundingSharePercent: promotion.sellerFundingSharePercent
      ? String(promotion.sellerFundingSharePercent)
      : "",
    stackingMode: promotion.stackingMode,
    priority: String(promotion.priority),
    isActive: promotion.isActive,
    startsAt: toLocalDateTime(promotion.startsAt),
    endsAt: toLocalDateTime(promotion.endsAt),
    ruleName: rule?.name ?? "",
    percentage: rule?.configuration.percentage
      ? String(rule.configuration.percentage)
      : "",
    amount: formatMinorAmount(rule?.configuration.amount),
    thresholdAmount: formatMinorAmount(rule?.configuration.thresholdAmount),
    categorySlugs: rule?.configuration.categorySlugs ?? [],
    listingIds: rule?.configuration.listingIds ?? [],
    buyQuantity: rule?.configuration.buyQuantity
      ? String(rule.configuration.buyQuantity)
      : "",
    getQuantity: rule?.configuration.getQuantity
      ? String(rule.configuration.getQuantity)
      : "",
    couponCode: coupon?.code ?? "",
    couponStatus: coupon?.status ?? "ACTIVE",
    couponUsageLimit: coupon?.usageLimit ? String(coupon.usageLimit) : "",
    couponStartsAt: toLocalDateTime(coupon?.startsAt ?? null),
    couponEndsAt: toLocalDateTime(coupon?.endsAt ?? null)
  };
}

function fundingHelperCopy(fundingSource: PromotionFundingSource) {
  if (fundingSource === "PLATFORM") {
    return "Customer pricing changes while seller settlement stays at the listed offer price.";
  }

  if (fundingSource === "SELLER") {
    return "The merchant funds the discount and receives a lower net payout.";
  }

  return "The discount is split between platform and seller by the configured share.";
}

export function PromotionConsole({
  initialPromotions,
  initialProducts,
  catalogOptions
}: PromotionConsoleProps): React.JSX.Element {
  const router = useRouter();
  const [promotions, setPromotions] = useState(initialPromotions);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(
    initialPromotions[0]?.promotionId ?? null
  );
  const [form, setForm] = useState<PromotionFormState>(
    toFormState(initialPromotions[0] ?? null)
  );
  const [offerQuery, setOfferQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const targetableOffers = initialProducts
    .filter((product) => product.listingId)
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title));
  const filteredOffers = (() => {
    const query = offerQuery.trim().toLowerCase();

    if (!query) {
      return targetableOffers;
    }

    return targetableOffers.filter((product) =>
      [
        product.title,
        product.sellerName,
        product.categoryName,
        product.brandName,
        product.sellerSku
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  })();
  const selectedTargetOffers = targetableOffers.filter(
    (product) => product.listingId && form.listingIds.includes(product.listingId)
  );
  const pricePreviewAmount = parseOptionalCurrency(form.amount);

  function setField<Key extends keyof PromotionFormState>(
    key: Key,
    value: PromotionFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function toggleCategory(slug: string) {
    setForm((current) => ({
      ...current,
      categorySlugs: current.categorySlugs.includes(slug)
        ? current.categorySlugs.filter((entry) => entry !== slug)
        : [...current.categorySlugs, slug]
    }));
  }

  function toggleListing(listingId: string) {
    setForm((current) => ({
      ...current,
      listingIds: current.listingIds.includes(listingId)
        ? current.listingIds.filter((entry) => entry !== listingId)
        : [...current.listingIds, listingId]
    }));
  }

  function handleCreateNew() {
    setSelectedPromotionId(null);
    setForm(emptyFormState);
    setOfferQuery("");
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handleSelectPromotion(promotionId: string) {
    const selectedPromotion =
      promotions.find((promotion) => promotion.promotionId === promotionId) ??
      null;

    setSelectedPromotionId(promotionId);
    setForm(toFormState(selectedPromotion));
    setOfferQuery("");
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const payload = {
      name: form.name,
      code: form.code.trim() ? form.code.trim().toUpperCase() : null,
      description: form.description,
      type: form.type,
      fundingSource: form.fundingSource,
      sellerFundingSharePercent:
        form.fundingSource === "SHARED"
          ? parseOptionalInteger(form.sellerFundingSharePercent) ?? null
          : null,
      stackingMode: form.stackingMode,
      priority: Number(form.priority),
      isActive: form.isActive,
      startsAt: parseOptionalDate(form.startsAt),
      endsAt: parseOptionalDate(form.endsAt),
      rule: {
        name: form.ruleName || `${form.type} rule`,
        configuration: {
          ...(parseOptionalInteger(form.percentage)
            ? { percentage: parseOptionalInteger(form.percentage) }
            : {}),
          ...(parseOptionalCurrency(form.amount)
            ? { amount: parseOptionalCurrency(form.amount) }
            : {}),
          ...(parseOptionalCurrency(form.thresholdAmount)
            ? { thresholdAmount: parseOptionalCurrency(form.thresholdAmount) }
            : {}),
          ...(form.categorySlugs.length
            ? { categorySlugs: form.categorySlugs }
            : {}),
          ...(form.listingIds.length ? { listingIds: form.listingIds } : {}),
          ...(parseOptionalInteger(form.buyQuantity)
            ? { buyQuantity: parseOptionalInteger(form.buyQuantity) }
            : {}),
          ...(parseOptionalInteger(form.getQuantity)
            ? { getQuantity: parseOptionalInteger(form.getQuantity) }
            : {})
        }
      },
      coupons: form.couponCode.trim()
        ? [
            {
              code: form.couponCode.trim().toUpperCase(),
              status: form.couponStatus,
              usageLimit: parseOptionalInteger(form.couponUsageLimit) ?? null,
              startsAt: parseOptionalDate(form.couponStartsAt),
              endsAt: parseOptionalDate(form.couponEndsAt)
            }
          ]
        : []
    };

    startTransition(async () => {
      const response = await fetch(
        selectedPromotionId
          ? `${apiUrl}/promotions/${selectedPromotionId}`
          : `${apiUrl}/promotions`,
        {
          method: selectedPromotionId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        setErrorMessage(
          "The promotion could not be saved. Verify funding, timing, and targeting values."
        );
        setIsPending(false);
        return;
      }

      const savedPromotion = (await response.json()) as PromotionSummary;

      setPromotions((current) => {
        const nextPromotions = current.filter(
          (promotion) => promotion.promotionId !== savedPromotion.promotionId
        );

        return [savedPromotion, ...nextPromotions].sort(
          (left, right) => left.priority - right.priority
        );
      });
      setSelectedPromotionId(savedPromotion.promotionId);
      setForm(toFormState(savedPromotion));
      setStatusMessage(
        selectedPromotionId
          ? "Promotion updated successfully."
          : "Promotion created successfully."
      );
      setIsPending(false);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Panel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Promotions
            </p>
            <h2 className="mt-3 font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
              Live pricing controls
            </h2>
          </div>
          <Button onClick={handleCreateNew} type="button" variant="secondary">
            New
          </Button>
        </div>

        <div className={ListScrollClassName()}>
          {promotions.map((promotion) => (
            <button
              key={promotion.promotionId}
              className={`rounded-[24px] border px-4 py-4 text-left transition-colors ${
                promotion.promotionId === selectedPromotionId
                  ? "border-[var(--accent)] bg-[rgba(15,118,110,0.08)]"
                  : "border-[var(--stroke)] bg-white"
              }`}
              onClick={() => handleSelectPromotion(promotion.promotionId)}
              type="button"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {promotion.name}
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {promotion.type.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {promotion.description}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {promotion.fundingSource} - Priority {promotion.priority}
              </p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Promotion name"
              onChange={(value) => setField("name", value)}
              value={form.name}
            />
            <Field
              label="Reference code"
              onChange={(value) => setField("code", value)}
              value={form.code}
            />
          </div>

          <Field
            label="Description"
            onChange={(value) => setField("description", value)}
            textarea
            value={form.description}
          />

          <div className="grid gap-5 md:grid-cols-4">
            <SelectField
              label="Type"
              onChange={(value) => setField("type", value as PromotionType)}
              options={promotionTypes}
              value={form.type}
            />
            <SelectField
              label="Funding"
              onChange={(value) =>
                setField("fundingSource", value as PromotionFundingSource)
              }
              options={fundingSources}
              value={form.fundingSource}
            />
            <SelectField
              label="Stacking"
              onChange={(value) =>
                setField("stackingMode", value as PromotionStackingMode)
              }
              options={stackingModes}
              value={form.stackingMode}
            />
            <Field
              label="Priority"
              onChange={(value) => setField("priority", value)}
              type="number"
              value={form.priority}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
            <Field
              hint={fundingHelperCopy(form.fundingSource)}
              label="Rule name"
              onChange={(value) => setField("ruleName", value)}
              value={form.ruleName}
            />
            {form.fundingSource === "SHARED" ? (
              <Field
                hint="Merchant-funded share of the total promotion discount."
                label="Seller share %"
                onChange={(value) => setField("sellerFundingSharePercent", value)}
                type="number"
                value={form.sellerFundingSharePercent}
              />
            ) : (
              <label className="flex items-center gap-3 rounded-[24px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm">
                <input
                  checked={form.isActive}
                  onChange={(event) => setField("isActive", event.target.checked)}
                  type="checkbox"
                />
                Active promotion
              </label>
            )}
          </div>

          {form.fundingSource === "SHARED" ? (
            <label className="flex items-center gap-3 rounded-[24px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm">
              <input
                checked={form.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
                type="checkbox"
              />
              Active promotion
            </label>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Starts at"
              onChange={(value) => setField("startsAt", value)}
              type="datetime-local"
              value={form.startsAt}
            />
            <Field
              label="Ends at"
              onChange={(value) => setField("endsAt", value)}
              type="datetime-local"
              value={form.endsAt}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Field
              label="Percentage"
              onChange={(value) => setField("percentage", value)}
              type="number"
              value={form.percentage}
            />
            <Field
              hint={
                pricePreviewAmount
                  ? `Customer-facing markdown: ${formatMoney(pricePreviewAmount)}`
                  : "Use a major-unit RON value like 150 or 49.99."
              }
              label="Fixed amount (RON)"
              onChange={(value) => setField("amount", value)}
              type="number"
              value={form.amount}
            />
            <Field
              hint="Minimum basket value before the discount can apply."
              label="Threshold (RON)"
              onChange={(value) => setField("thresholdAmount", value)}
              type="number"
              value={form.thresholdAmount}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Buy quantity"
              onChange={(value) => setField("buyQuantity", value)}
              type="number"
              value={form.buyQuantity}
            />
            <Field
              label="Get quantity"
              onChange={(value) => setField("getQuantity", value)}
              type="number"
              value={form.getQuantity}
            />
          </div>

          <div className="grid gap-5 rounded-[28px] border border-[var(--stroke)] bg-[rgba(15,23,42,0.02)] p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Merchandising scope
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Target categories or specific marketplace offers. Automatic
                product pricing presentation uses only non-coupon merchandising
                promotions.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {catalogOptions.categories.map((category) => (
                    <button
                      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                        form.categorySlugs.includes(category.slug)
                          ? "border-[var(--accent)] bg-[rgba(15,118,110,0.08)] text-[var(--accent)]"
                          : "border-[var(--stroke)] bg-white text-[var(--muted)]"
                      }`}
                      key={category.categoryId}
                      onClick={() => toggleCategory(category.slug)}
                      type="button"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Target offers
                  </p>
                  <input
                    className="w-full max-w-[260px] rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
                    onChange={(event) => setOfferQuery(event.target.value)}
                    placeholder="Search products or sellers"
                    value={offerQuery}
                  />
                </div>
                <div className={ListScrollClassName()}>
                  {filteredOffers.map((product) =>
                    product.listingId ? (
                      <button
                        className={`rounded-[22px] border px-4 py-4 text-left transition-colors ${
                          form.listingIds.includes(product.listingId)
                            ? "border-[var(--accent)] bg-[rgba(15,118,110,0.08)]"
                            : "border-[var(--stroke)] bg-white"
                        }`}
                        key={product.listingId}
                        onClick={() => toggleListing(product.listingId!)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-[var(--foreground)]">
                            {product.title}
                          </span>
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                            {product.price
                              ? formatMoney(product.price.amount, product.price.currency)
                              : "No price"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {[product.sellerName, product.categoryName, product.brandName]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      </button>
                    ) : null
                  )}
                </div>
                {selectedTargetOffers.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTargetOffers.map((product) => (
                      <span
                        className="rounded-full border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]"
                        key={product.listingId}
                      >
                        {product.title}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-5 rounded-[28px] border border-[var(--stroke)] bg-[rgba(15,23,42,0.02)] p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Optional coupon
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Coupon code"
                onChange={(value) => setField("couponCode", value)}
                value={form.couponCode}
              />
              <SelectField
                label="Coupon status"
                onChange={(value) => setField("couponStatus", value as CouponStatus)}
                options={couponStatuses}
                value={form.couponStatus}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <Field
                label="Usage limit"
                onChange={(value) => setField("couponUsageLimit", value)}
                type="number"
                value={form.couponUsageLimit}
              />
              <Field
                label="Coupon starts"
                onChange={(value) => setField("couponStartsAt", value)}
                type="datetime-local"
                value={form.couponStartsAt}
              />
              <Field
                label="Coupon ends"
                onChange={(value) => setField("couponEndsAt", value)}
                type="datetime-local"
                value={form.couponEndsAt}
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[24px] border border-[rgba(185,28,28,0.12)] bg-[rgba(185,28,28,0.05)] px-4 py-3 text-sm text-[rgb(185,28,28)]">
              {errorMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="rounded-[24px] border border-[rgba(15,118,110,0.12)] bg-[rgba(15,118,110,0.06)] px-4 py-3 text-sm text-[var(--accent)]">
              {statusMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Platform-funded promotions preserve seller settlement, while
              seller-funded and shared promotions feed order-level funding
              attribution for payout review.
            </p>
            <Button disabled={isPending} type="submit">
              {isPending
                ? "Saving..."
                : selectedPromotionId
                  ? "Update promotion"
                  : "Create promotion"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function Field({
  label,
  hint,
  onChange,
  placeholder,
  textarea = false,
  type = "text",
  value
}: {
  label: string;
  hint?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  type?: string;
  value: string;
}) {
  const className =
    "mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]";

  return (
    <label className="text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        {label}
      </span>
      {textarea ? (
        <textarea
          className={`${className} min-h-28 resize-y`}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <input
          className={className}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      )}
      {hint ? <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{hint}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        {label}
      </span>
      <select
        className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
