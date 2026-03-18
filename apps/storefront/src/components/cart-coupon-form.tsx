"use client";

import { Button } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

interface CartCouponFormProps {
  couponCode: string | null;
}

export function CartCouponForm({
  couponCode
}: CartCouponFormProps): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState(couponCode ?? "");
  const [pendingAction, setPendingAction] = useState<"apply" | "remove" | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleApplyCoupon() {
    const normalizedValue = value.trim().toUpperCase();

    if (!normalizedValue) {
      setErrorMessage("Enter a coupon code before applying it.");
      return;
    }

    setPendingAction("apply");
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/commerce/cart/coupon", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            couponCode: normalizedValue
          })
        });

        if (!response.ok) {
          setErrorMessage(
            "The coupon could not be applied to the current cart."
          );
          setPendingAction(null);
          return;
        }

        setValue(normalizedValue);
        setPendingAction(null);
        router.refresh();
      } catch {
        setErrorMessage("The coupon could not be applied right now.");
        setPendingAction(null);
      }
    });
  }

  function handleRemoveCoupon() {
    setPendingAction("remove");
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/commerce/cart/coupon", {
          method: "DELETE"
        });

        if (!response.ok) {
          setErrorMessage("The coupon could not be removed right now.");
          setPendingAction(null);
          return;
        }

        setValue("");
        setPendingAction(null);
        router.refresh();
      } catch {
        setErrorMessage("The coupon could not be removed right now.");
        setPendingAction(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label
          className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]"
          htmlFor="coupon-code"
        >
          Coupon code
        </label>
        <input
          id="coupon-code"
          className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
          disabled={pendingAction !== null}
          onChange={(event) => setValue(event.target.value.toUpperCase())}
          placeholder="DEMO5"
          value={value}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={pendingAction !== null}
          onClick={handleApplyCoupon}
          type="button"
          variant="secondary"
        >
          {pendingAction === "apply" ? "Applying..." : "Apply coupon"}
        </Button>
        {couponCode ? (
          <Button
            disabled={pendingAction !== null}
            onClick={handleRemoveCoupon}
            type="button"
            variant="ghost"
          >
            {pendingAction === "remove" ? "Removing..." : "Remove coupon"}
          </Button>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="text-sm text-[var(--accent)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
