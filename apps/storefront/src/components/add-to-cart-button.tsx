"use client";

import { Button } from "@velora/ui";
import { startTransition, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface AddToCartButtonProps {
  listingId: string;
  disabled?: boolean;
  label?: string;
  quantity?: number;
  className?: string;
}

export function AddToCartButton({
  listingId,
  disabled = false,
  label = "Add to cart",
  quantity = 1,
  className
}: AddToCartButtonProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleAddToCart() {
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      const response = await fetch(`${apiUrl}/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          listingId,
          quantity
        })
      });

      if (response.status === 401) {
        router.push(`/login?from=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          "The item could not be added. Check availability or sign in again."
        );
        setIsPending(false);
        return;
      }

      router.push("/cart");
      router.refresh();
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
        {isPending ? "Adding..." : label}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-[var(--accent)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
