"use client";

import { Button } from "@velora/ui";
import { startTransition, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface CartItemActionsProps {
  itemId: string;
  quantity: number;
}

export function CartItemActions({
  itemId,
  quantity
}: CartItemActionsProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function runMutation(url: string, init: RequestInit) {
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      const response = await fetch(url, {
        ...init,
        credentials: "include"
      });

      if (response.status === 401) {
        router.push(`/login?from=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok) {
        setErrorMessage("The cart update was rejected. Refresh and try again.");
        setIsPending(false);
        return;
      }

      router.refresh();
    });
  }

  function updateQuantity(nextQuantity: number) {
    runMutation(`${apiUrl}/cart/items/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        quantity: nextQuantity
      })
    });
  }

  function removeItem() {
    runMutation(`${apiUrl}/cart/items/${itemId}`, {
      method: "DELETE"
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={isPending || quantity <= 1}
          onClick={() => updateQuantity(quantity - 1)}
          type="button"
          variant="secondary"
        >
          -
        </Button>
        <span className="min-w-10 text-center text-sm font-semibold">
          {quantity}
        </span>
        <Button
          disabled={isPending || quantity >= 99}
          onClick={() => updateQuantity(quantity + 1)}
          type="button"
          variant="secondary"
        >
          +
        </Button>
        <Button
          disabled={isPending}
          onClick={removeItem}
          type="button"
          variant="ghost"
        >
          Remove
        </Button>
      </div>
      {errorMessage ? (
        <p className="text-sm text-[var(--accent)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
