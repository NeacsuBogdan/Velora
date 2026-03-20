"use client";

import Link from "next/link";
import { useState } from "react";

import { AddToCartButton } from "./add-to-cart-button";

type AttributeGroup = {
  name: string;
  values: string[];
};

interface ProductPurchasePanelProps {
  listingId: string;
  sellerName: string;
  sellerSku: string;
  availableQuantity: number;
  inStock: boolean;
  leadTimeDays: number;
  attributeGroups: AttributeGroup[];
}

export function ProductPurchasePanel({
  listingId,
  sellerName,
  sellerSku,
  availableQuantity,
  inStock,
  leadTimeDays,
  attributeGroups
}: ProductPurchasePanelProps): React.JSX.Element {
  const [quantity, setQuantity] = useState(1);
  const maxQuantity = Math.min(Math.max(availableQuantity, 1), 99);

  function updateQuantity(nextQuantity: number) {
    setQuantity(Math.max(1, Math.min(nextQuantity, maxQuantity)));
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(73,38,155,0.24),rgba(29,13,68,0.88))] p-6 text-white shadow-[0_22px_54px_rgba(10,4,30,0.24)] backdrop-blur-sm sm:p-7">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
            Purchase setup
          </p>
          <p className="text-base leading-7 text-white/66">
            Configure quantity, review availability, and add the current lead
            offer straight into the live cart flow.
          </p>
        </div>

        {attributeGroups.length ? (
          <div className="space-y-4">
            {attributeGroups.map((group) => (
              <div key={group.name} className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/72">
                  {group.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.values.map((value, index) => (
                    <span
                      className={`rounded-[18px] border px-4 py-3 text-sm font-semibold ${
                        index === 0
                          ? "border-white/18 bg-[linear-gradient(135deg,rgba(124,88,255,0.92),rgba(85,48,196,0.98))] text-white shadow-[0_16px_38px_rgba(19,9,52,0.22)]"
                          : "border-white/10 bg-[rgba(255,255,255,0.05)] text-white/78"
                      }`}
                      key={`${group.name}-${value}`}
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
          <p className="text-sm font-semibold text-white/76">Quantity</p>
          <div className="inline-flex items-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <button
              className="flex h-11 w-12 items-center justify-center rounded-full text-xl text-white transition-colors hover:bg-[rgba(255,255,255,0.08)] disabled:text-white/30"
              disabled={quantity <= 1}
              onClick={() => updateQuantity(quantity - 1)}
              type="button"
            >
              -
            </button>
            <span className="flex h-11 min-w-14 items-center justify-center text-lg font-semibold text-white">
              {quantity}
            </span>
            <button
              className="flex h-11 w-12 items-center justify-center rounded-full text-xl text-white transition-colors hover:bg-[rgba(255,255,255,0.08)] disabled:text-white/30"
              disabled={!inStock || quantity >= maxQuantity}
              onClick={() => updateQuantity(quantity + 1)}
              type="button"
            >
              +
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AddToCartButton
            className="min-h-14 w-full rounded-full border border-white/16 bg-[linear-gradient(135deg,rgba(124,88,255,0.92),rgba(85,48,196,0.98))] text-base font-semibold text-white shadow-[0_18px_48px_rgba(19,9,52,0.3)] transition-all hover:-translate-y-0.5"
            disabled={!inStock}
            label={inStock ? "Add to cart" : "Offer unavailable"}
            listingId={listingId}
            quantity={quantity}
          />
          <Link
            className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] px-5 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/22 hover:bg-[rgba(255,255,255,0.11)]"
            href="#offers"
          >
            View seller offers
          </Link>
        </div>

        <div className="grid gap-3 text-sm text-white/68 sm:grid-cols-2">
          <div className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/46">
              Seller
            </p>
            <p className="mt-2 text-base font-semibold text-white">{sellerName}</p>
            <p className="mt-1">SKU {sellerSku}</p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/46">
              Fulfillment
            </p>
            <p className="mt-2 text-base font-semibold text-white">
              {inStock ? `${availableQuantity} units ready` : "Currently unavailable"}
            </p>
            <p className="mt-1">Lead time {leadTimeDays} day(s)</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-white/62">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2.5">
            <ShieldIcon />
            Secure checkout
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2.5">
            <TruckIcon />
            Delivery tracking
          </div>
        </div>
      </div>
    </div>
  );
}

function ShieldIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 24 24"
      width="16"
    >
      <path
        d="M12 4.75 6.75 6.6v4.28c0 3.14 1.87 5.98 4.75 7.22 2.88-1.24 4.75-4.08 4.75-7.22V6.6L12 4.75Zm-2.5 7.5 1.65 1.65 3.35-3.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TruckIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 24 24"
      width="16"
    >
      <path
        d="M4.75 7.25h9.5v7h-9.5zm9.5 2.5h3.25l1.75 2.5v2h-5zm-7.5 6a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5Zm9.5 0a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
