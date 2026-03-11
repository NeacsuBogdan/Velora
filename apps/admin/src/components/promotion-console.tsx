"use client";

import type {
  CouponStatus,
  PromotionStackingMode,
  PromotionSummary,
  PromotionType
} from "@velora/contracts";
import { Button, Panel } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const promotionTypes: PromotionType[] = [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "CART_THRESHOLD",
  "CATEGORY_DISCOUNT",
  "BUY_X_GET_Y"
];

const stackingModes: PromotionStackingMode[] = ["STACKABLE", "EXCLUSIVE"];
const couponStatuses: CouponStatus[] = ["ACTIVE", "DISABLED", "EXPIRED"];

interface PromotionConsoleProps {
  initialPromotions: PromotionSummary[];
}

interface PromotionFormState {
  name: string;
  code: string;
  description: string;
  type: PromotionType;
  stackingMode: PromotionStackingMode;
  priority: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  ruleName: string;
  percentage: string;
  amount: string;
  thresholdAmount: string;
  categorySlugs: string;
  listingIds: string;
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
  stackingMode: "STACKABLE",
  priority: "100",
  isActive: true,
  startsAt: "",
  endsAt: "",
  ruleName: "",
  percentage: "",
  amount: "",
  thresholdAmount: "",
  categorySlugs: "",
  listingIds: "",
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
    stackingMode: promotion.stackingMode,
    priority: String(promotion.priority),
    isActive: promotion.isActive,
    startsAt: toLocalDateTime(promotion.startsAt),
    endsAt: toLocalDateTime(promotion.endsAt),
    ruleName: rule?.name ?? "",
    percentage: rule?.configuration.percentage
      ? String(rule.configuration.percentage)
      : "",
    amount: rule?.configuration.amount ? String(rule.configuration.amount) : "",
    thresholdAmount: rule?.configuration.thresholdAmount
      ? String(rule.configuration.thresholdAmount)
      : "",
    categorySlugs: rule?.configuration.categorySlugs?.join(", ") ?? "",
    listingIds: rule?.configuration.listingIds?.join(", ") ?? "",
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

function parseList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseOptionalNumber(value: string) {
  return value.trim().length > 0 ? Number(value) : undefined;
}

function parseOptionalDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function PromotionConsole({
  initialPromotions
}: PromotionConsoleProps): React.JSX.Element {
  const router = useRouter();
  const [promotions, setPromotions] = useState(initialPromotions);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(
    initialPromotions[0]?.promotionId ?? null
  );
  const [form, setForm] = useState<PromotionFormState>(
    toFormState(initialPromotions[0] ?? null)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function setField<Key extends keyof PromotionFormState>(
    key: Key,
    value: PromotionFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleCreateNew() {
    setSelectedPromotionId(null);
    setForm(emptyFormState);
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handleSelectPromotion(promotionId: string) {
    const selectedPromotion =
      promotions.find((promotion) => promotion.promotionId === promotionId) ??
      null;

    setSelectedPromotionId(promotionId);
    setForm(toFormState(selectedPromotion));
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
      stackingMode: form.stackingMode,
      priority: Number(form.priority),
      isActive: form.isActive,
      startsAt: parseOptionalDate(form.startsAt),
      endsAt: parseOptionalDate(form.endsAt),
      rule: {
        name: form.ruleName || `${form.type} rule`,
        configuration: {
          ...(parseOptionalNumber(form.percentage)
            ? { percentage: parseOptionalNumber(form.percentage) }
            : {}),
          ...(parseOptionalNumber(form.amount)
            ? { amount: parseOptionalNumber(form.amount) }
            : {}),
          ...(parseOptionalNumber(form.thresholdAmount)
            ? { thresholdAmount: parseOptionalNumber(form.thresholdAmount) }
            : {}),
          ...(parseList(form.categorySlugs).length
            ? { categorySlugs: parseList(form.categorySlugs) }
            : {}),
          ...(parseList(form.listingIds).length
            ? { listingIds: parseList(form.listingIds) }
            : {}),
          ...(parseOptionalNumber(form.buyQuantity)
            ? { buyQuantity: parseOptionalNumber(form.buyQuantity) }
            : {}),
          ...(parseOptionalNumber(form.getQuantity)
            ? { getQuantity: parseOptionalNumber(form.getQuantity) }
            : {})
        }
      },
      coupons: form.couponCode.trim()
        ? [
            {
              code: form.couponCode.trim().toUpperCase(),
              status: form.couponStatus,
              usageLimit: parseOptionalNumber(form.couponUsageLimit) ?? null,
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
          "The promotion could not be saved. Verify the rule configuration and admin session."
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

        <div className="grid gap-3">
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
                Priority {promotion.priority} · {promotion.stackingMode}
              </p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <form className="grid gap-5" onSubmit={handleSubmit}>
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

          <div className="grid gap-5 md:grid-cols-3">
            <SelectField
              label="Type"
              onChange={(value) => setField("type", value as PromotionType)}
              options={promotionTypes}
              value={form.type}
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

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Rule name"
              onChange={(value) => setField("ruleName", value)}
              value={form.ruleName}
            />
            <label className="flex items-center gap-3 rounded-[24px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm">
              <input
                checked={form.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
                type="checkbox"
              />
              Active promotion
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Field
              label="Percentage"
              onChange={(value) => setField("percentage", value)}
              type="number"
              value={form.percentage}
            />
            <Field
              label="Fixed amount"
              onChange={(value) => setField("amount", value)}
              type="number"
              value={form.amount}
            />
            <Field
              label="Threshold amount"
              onChange={(value) => setField("thresholdAmount", value)}
              type="number"
              value={form.thresholdAmount}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Category slugs"
              onChange={(value) => setField("categorySlugs", value)}
              placeholder="phones, audio"
              value={form.categorySlugs}
            />
            <Field
              label="Listing ids"
              onChange={(value) => setField("listingIds", value)}
              placeholder="listing-1, listing-2"
              value={form.listingIds}
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
            <p className="text-sm leading-7 text-[var(--muted)]">
              The form writes directly to the promotion engine endpoints used by
              cart repricing and checkout snapshots.
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
  onChange,
  placeholder,
  textarea = false,
  type = "text",
  value
}: {
  label: string;
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
