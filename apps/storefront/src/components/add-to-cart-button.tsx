"use client";

import { Button } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

interface AddToCartButtonProps {
  listingId: string;
  disabled?: boolean;
  label?: React.ReactNode;
  pendingLabel?: React.ReactNode;
  quantity?: number;
  className?: string;
}

export function AddToCartButton({
  listingId,
  disabled = false,
  label = "Add to cart",
  pendingLabel = "Adding...",
  quantity = 1,
  className
}: AddToCartButtonProps): React.JSX.Element {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleAddToCart() {
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/commerce/cart/items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            listingId,
            quantity
          })
        });

        if (!response.ok) {
          setErrorMessage(
            "The item could not be added. Check availability and try again."
          );
          setIsPending(false);
          return;
        }

        router.push("/cart");
        router.refresh();
      } catch {
        setErrorMessage(
          "The storefront could not update the cart right now. Try again."
        );
        setIsPending(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button
        className={className}
        disabled={disabled || isPending}
        onClick={handleAddToCart}
        type="button"
      >
        {isPending ? pendingLabel : label}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-[var(--accent)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
