"use client";

import { Button } from "@velora/ui";
import { startTransition, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface StartCheckoutButtonProps {
  disabled?: boolean;
  label?: string;
}

export function StartCheckoutButton({
  disabled = false,
  label = "Reserve stock for checkout"
}: StartCheckoutButtonProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleCheckout() {
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      const response = await fetch(`${apiUrl}/checkout/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID()
        })
      });

      if (response.status === 401) {
        router.push(`/login?from=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          "Reservation could not be started. Verify stock and cart consistency."
        );
        setIsPending(false);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={disabled || isPending}
        onClick={handleCheckout}
        type="button"
      >
        {isPending ? "Reserving..." : label}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-[var(--accent)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
