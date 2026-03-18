"use client";

import { Button } from "@velora/ui";
import { useRouter } from "next/navigation";

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

  function handleCheckout() {
    if (activeCheckoutSessionId) {
      router.push(
        `/checkout?session=${encodeURIComponent(activeCheckoutSessionId)}`
      );
      return;
    }

    router.push("/checkout");
  }

  return (
    <Button className="w-full" disabled={disabled} onClick={handleCheckout} type="button">
      {activeCheckoutSessionId ? "Resume checkout" : label}
    </Button>
  );
}
