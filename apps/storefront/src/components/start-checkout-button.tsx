"use client";

import { Button } from "@velora/ui";
import { startTransition, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface StartCheckoutButtonProps {
  disabled?: boolean;
  label?: string;
  activeCheckoutSessionId?: string | null;
}

export function StartCheckoutButton({
  disabled = false,
  label = "Reserve stock for checkout",
  activeCheckoutSessionId = null
}: StartCheckoutButtonProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleCheckout() {
    if (activeCheckoutSessionId) {
      router.push(
        `/checkout?session=${encodeURIComponent(activeCheckoutSessionId)}`
      );
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
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

        const checkoutSession = (await response.json()) as {
          checkoutSessionId: string;
        };
        router.push(
          `/checkout?session=${encodeURIComponent(checkoutSession.checkoutSessionId)}`
        );
        router.refresh();
      } catch {
        setErrorMessage(
          "The checkout reservation could not be started right now."
        );
        setIsPending(false);
      }
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
        {isPending
          ? "Reserving..."
          : activeCheckoutSessionId
            ? "Resume checkout"
            : label}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-[var(--accent)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
