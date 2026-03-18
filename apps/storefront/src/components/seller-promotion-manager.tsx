"use client";

import type { PromotionSummary, SellerListingSummary } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { formatMoney } from "../lib/formatting";
import { StatusBadge } from "./status-badge";

const sellerApiBaseUrl = "/api/seller";

type SellerPromotionFormState = {
  name: string;
  description: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  percentage: string;
  amount: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

const emptyFormState: SellerPromotionFormState = {
  name: "",
  description: "",
  type: "PERCENTAGE",
  percentage: "",
  amount: "",
  isActive: true,
  startsAt: "",
  endsAt: ""
};

export function SellerPromotionManager({
  promotions,
  selectedListing
}: {
  promotions: PromotionSummary[];
  selectedListing: SellerListingSummary;
}): React.JSX.Element {
  const router = useRouter();
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<SellerPromotionFormState>(emptyFormState);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const listingPromotions = promotions
    .filter((promotion) =>
      promotion.rules.some((rule) =>
        rule.configuration.listingIds?.includes(selectedListing.listingId)
      )
    )
    .slice()
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  const selectedPromotion =
    listingPromotions.find(
      (promotion) => promotion.promotionId === selectedPromotionId
    ) ?? null;
  const basePriceAmount = selectedListing.price?.amount ?? null;
  const expectedPriceAmount =
    basePriceAmount === null
      ? null
      : calculateExpectedPromotionalPrice(basePriceAmount, form);

  useEffect(() => {
    const availablePromotions = promotions
      .filter((promotion) =>
        promotion.rules.some((rule) =>
          rule.configuration.listingIds?.includes(selectedListing.listingId)
        )
      )
      .slice()
      .sort((left, right) => {
        if (left.isActive !== right.isActive) {
          return left.isActive ? -1 : 1;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });

    if (selectedPromotionId) {
      const nextSelectedPromotion =
        availablePromotions.find(
          (promotion) => promotion.promotionId === selectedPromotionId
        ) ?? null;

      if (nextSelectedPromotion) {
        setForm(toFormState(nextSelectedPromotion));
        return;
      }
    }

    const fallbackPromotion = availablePromotions[0] ?? null;
    setSelectedPromotionId(fallbackPromotion?.promotionId ?? null);
    setForm(toFormState(fallbackPromotion));
    setMessage(null);
    setErrorMessage(null);
  }, [promotions, selectedListing.listingId, selectedPromotionId]);

  function setField<Key extends keyof SellerPromotionFormState>(
    key: Key,
    value: SellerPromotionFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleCreateNew() {
    setSelectedPromotionId(null);
    setForm(emptyFormState);
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);
    setErrorMessage(null);

    const payload = buildPayload(form, selectedListing.listingId);

    if (!payload) {
      setErrorMessage(
        form.type === "PERCENTAGE"
          ? "Enter a valid discount percentage between 0 and 100."
          : "Enter a valid fixed discount amount in RON, for example 20 or 20.00."
      );
      setIsPending(false);
      return;
    }

    try {
      const response = await fetch(
        selectedPromotionId
          ? `${sellerApiBaseUrl}/promotions/${selectedPromotionId}`
          : `${sellerApiBaseUrl}/promotions`,
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
          (await readResponseMessage(response)) ??
            "The seller campaign could not be saved. Review the discount value and active dates."
        );
        return;
      }

      setMessage(
        selectedPromotionId
          ? "Seller-funded campaign updated for this offer."
          : "Seller-funded campaign created for this offer."
      );

      startTransition(() => {
        router.refresh();
      });
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

      setSelectedPromotionId(null);
      setForm(emptyFormState);
      setMessage("Seller-funded campaign deleted.");

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage(
        "The API is unavailable. Start the backend and retry the delete action."
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-4 rounded-[28px] border border-[var(--stroke)] bg-white/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Seller campaign
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Create seller-funded discounts for this offer only. The customer sees
            the discounted price, while your seller payout is reduced by the
            funded amount on affected orders.
          </p>
        </div>
        <Button onClick={handleCreateNew} type="button" variant="secondary">
          New campaign
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricTile
          label="Listed price"
          value={
            basePriceAmount === null
              ? "No price"
              : formatMoney({
                  amount: basePriceAmount,
                  currency: "RON"
                })
          }
        />
        <MetricTile
          label="Expected customer price"
          value={
            expectedPriceAmount === null
              ? "Set price first"
              : formatMoney({
                  amount: expectedPriceAmount,
                  currency: "RON"
                })
          }
        />
        <MetricTile label="Funding" value="Seller funded" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.4fr)]">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Offer campaigns
          </p>
          {listingPromotions.length ? (
            <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
              {listingPromotions.map((promotion) => {
                const isSelected =
                  promotion.promotionId === selectedPromotionId;
                const summary = describePromotionValue(promotion);

                return (
                  <button
                    key={promotion.promotionId}
                    className={`grid gap-2 rounded-[22px] border px-4 py-4 text-left transition ${
                      isSelected
                        ? "border-[var(--accent)] bg-[rgba(218,41,28,0.06)]"
                        : "border-[var(--stroke)] bg-white hover:border-[var(--accent)]/40"
                    }`}
                    onClick={() => {
                      setSelectedPromotionId(promotion.promotionId);
                      setForm(toFormState(promotion));
                      setMessage(null);
                      setErrorMessage(null);
                    }}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-[var(--foreground)]">
                        {promotion.name}
                      </strong>
                      <StatusBadge value={promotion.isActive ? "ACTIVE" : "PAUSED"} />
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {promotion.type.replace(/_/g, " ")} - {summary}
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {formatPromotionWindow(promotion)}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--stroke)] bg-white/70 px-4 py-5 text-sm leading-7 text-[var(--muted)]">
              No seller-funded campaign exists for this offer yet.
            </div>
          )}
        </div>

        <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-semibold text-[var(--foreground)]">
                Campaign name
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="name"
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Weekend seller markdown"
                type="text"
                value={form.name}
              />
            </label>

            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-semibold text-[var(--foreground)]">
                Campaign description
              </span>
              <textarea
                className="min-h-28 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="description"
                onChange={(event) =>
                  setField("description", event.target.value)
                }
                placeholder="Short customer-facing reason for the merchant-funded discount."
                value={form.description}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Campaign type
              </span>
              <select
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="type"
                onChange={(event) =>
                  setField(
                    "type",
                    event.target.value as SellerPromotionFormState["type"]
                  )
                }
                value={form.type}
              >
                <option value="PERCENTAGE">Percentage off</option>
                <option value="FIXED_AMOUNT">Fixed amount off</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Campaign status
              </span>
              <select
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                name="isActive"
                onChange={(event) =>
                  setField("isActive", event.target.value === "true")
                }
                value={String(form.isActive)}
              >
                <option value="true">Active</option>
                <option value="false">Paused</option>
              </select>
            </label>

            {form.type === "PERCENTAGE" ? (
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-[var(--foreground)]">
                  Percentage off
                </span>
                <input
                  className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
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
            ) : (
              <MoneyField
                label="Fixed discount"
                onChange={(value) => setField("amount", value)}
                placeholder="20.00"
                previewLabel="Discount preview"
                value={form.amount}
              />
            )}

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Starts at
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                onChange={(event) => setField("startsAt", event.target.value)}
                type="datetime-local"
                value={form.startsAt}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-[var(--foreground)]">
                Ends at
              </span>
              <input
                className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
                onChange={(event) => setField("endsAt", event.target.value)}
                type="datetime-local"
                value={form.endsAt}
              />
            </label>
          </div>

          <div className="grid gap-3 border-t border-[var(--stroke)] pt-4">
            <p className="text-sm leading-7 text-[var(--muted)]">
              This campaign is seller-funded and scoped to{" "}
              <strong>{selectedListing.sellerSku}</strong>. Platform-wide and
              subsidized promotions still remain in the admin pricing console.
            </p>
            {selectedListing.status === "ARCHIVED" ? (
              <p className="text-sm leading-7 text-[var(--muted)]">
                This offer is archived. Reactivate the offer before expecting the
                campaign to appear in the storefront.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={isPending} type="submit" variant="secondary">
                {isPending
                  ? "Saving..."
                  : selectedPromotion
                    ? "Update campaign"
                    : "Create campaign"}
              </Button>
              {selectedPromotion ? (
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
          </div>

          {message ? (
            <p className="text-sm text-[var(--muted)]">{message}</p>
          ) : null}
          {errorMessage ? (
            <p className="text-sm text-[var(--accent)]">{errorMessage}</p>
          ) : null}
        </form>
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
    <div className="rounded-[22px] bg-black/3 px-4 py-4">
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
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-[var(--foreground)]">{label}</span>
      <input
        className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 outline-none transition-colors focus:border-[var(--accent)]"
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

function toFormState(promotion: PromotionSummary | null): SellerPromotionFormState {
  if (!promotion) {
    return emptyFormState;
  }

  const configuration = promotion.rules[0]?.configuration;

  return {
    name: promotion.name,
    description: promotion.description,
    type: promotion.type === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE",
    percentage:
      promotion.type === "PERCENTAGE" && configuration?.percentage !== undefined
        ? String(configuration.percentage)
        : "",
    amount:
      promotion.type === "FIXED_AMOUNT" && configuration?.amount !== undefined
        ? formatMajorUnitInput(configuration.amount)
        : "",
    isActive: promotion.isActive,
    startsAt: toLocalDateTime(promotion.startsAt),
    endsAt: toLocalDateTime(promotion.endsAt)
  };
}

function buildPayload(
  form: SellerPromotionFormState,
  listingId: string
) {
  const payload = {
    name: form.name.trim(),
    description: form.description.trim(),
    type: form.type,
    listingId,
    isActive: form.isActive,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    percentage:
      form.type === "PERCENTAGE" ? parseOptionalNumber(form.percentage) : undefined,
    amount:
      form.type === "FIXED_AMOUNT"
        ? parseMajorUnitInputToMinor(form.amount)
        : undefined
  };

  if (!payload.name || !payload.description) {
    return null;
  }

  if (form.type === "PERCENTAGE" && payload.percentage === undefined) {
    return null;
  }

  if (form.type === "FIXED_AMOUNT" && payload.amount === null) {
    return null;
  }

  return payload;
}

function calculateExpectedPromotionalPrice(
  basePriceAmount: number,
  form: SellerPromotionFormState
) {
  if (form.type === "PERCENTAGE") {
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

function describePromotionValue(promotion: PromotionSummary) {
  const configuration = promotion.rules[0]?.configuration;

  if (promotion.type === "PERCENTAGE" && configuration?.percentage !== undefined) {
    return `${configuration.percentage}% off`;
  }

  if (promotion.type === "FIXED_AMOUNT" && configuration?.amount !== undefined) {
    return formatMoney({
      amount: configuration.amount,
      currency: "RON"
    });
  }

  return promotion.type.replace(/_/g, " ");
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

async function readResponseMessage(response: Response): Promise<string | null> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return payload?.message ?? null;
}
