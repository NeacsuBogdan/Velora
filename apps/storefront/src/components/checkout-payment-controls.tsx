"use client";

import type {
  CheckoutStatus,
  PaymentAttemptSummary,
  PaymentScenario
} from "@velora/contracts";
import { Button } from "@velora/ui";
import Link from "next/link";
import { startTransition, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface PaymentConfirmationResponse {
  attempt: PaymentAttemptSummary;
  checkout: {
    status: CheckoutStatus;
  };
  order: {
    number: string;
  } | null;
  message: string;
}

interface CheckoutPaymentControlsProps {
  checkoutSessionId: string;
  initialAttempt: PaymentAttemptSummary | null;
  initialStatus: CheckoutStatus;
  initialOrderNumber: string | null;
}

const scenarioLabels: Record<PaymentScenario, string> = {
  success: "Approve payment",
  declined: "Simulate decline",
  requires_action: "Require action"
};

export function CheckoutPaymentControls({
  checkoutSessionId,
  initialAttempt,
  initialStatus,
  initialOrderNumber
}: CheckoutPaymentControlsProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [attempt, setAttempt] = useState(initialAttempt);
  const [checkoutStatus, setCheckoutStatus] = useState(initialStatus);
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleCreateAttempt() {
    setPendingAction("create");
    setErrorMessage(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(
        `${apiUrl}/payments/checkout-sessions/${checkoutSessionId}/attempts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID()
          })
        }
      );

      if (response.status === 401) {
        router.push(`/login?from=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          "Payment preparation failed. Verify the reservation is still active."
        );
        setPendingAction(null);
        return;
      }

      const nextAttempt = (await response.json()) as PaymentAttemptSummary;
      setAttempt(nextAttempt);
      setCheckoutStatus("PAYMENT_PENDING");
      setMessage("Payment attempt created. Choose a sandbox outcome to continue.");
      setPendingAction(null);
      router.refresh();
    });
  }

  function handleConfirmAttempt(scenario: PaymentScenario) {
    if (!attempt) {
      return;
    }

    setPendingAction(scenario);
    setErrorMessage(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(
        `${apiUrl}/payments/attempts/${attempt.attemptId}/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            scenario
          })
        }
      );

      if (response.status === 401) {
        router.push(`/login?from=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          "Payment confirmation failed. Refresh the session or create a new attempt."
        );
        setPendingAction(null);
        return;
      }

      const confirmation =
        (await response.json()) as PaymentConfirmationResponse;
      setAttempt(confirmation.attempt);
      setCheckoutStatus(confirmation.checkout.status);
      setMessage(confirmation.message);
      setOrderNumber(confirmation.order?.number ?? null);
      setPendingAction(null);

      if (confirmation.order?.number) {
        router.push(
          `/checkout/confirmation/${encodeURIComponent(confirmation.order.number)}`
        );
        router.refresh();
        return;
      }

      router.refresh();
    });
  }

  const canCreateAttempt =
    !attempt && checkoutStatus !== "COMPLETED" && checkoutStatus !== "EXPIRED";
  const canConfirmAttempt =
    attempt &&
    checkoutStatus !== "COMPLETED" &&
    checkoutStatus !== "EXPIRED" &&
    attempt.status !== "SUCCEEDED";

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[var(--stroke)] bg-black/3 p-4 text-sm text-[var(--muted)]">
        {orderNumber ? (
          <p>
            This checkout already produced order{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {orderNumber}
            </span>
            .
          </p>
        ) : (
          <p>
            Use the sandbox controls to simulate the PaymentIntent lifecycle:
            success, issuer decline, or additional customer action.
          </p>
        )}
      </div>

      {attempt ? (
        <div className="grid gap-3 rounded-[24px] border border-[var(--stroke)] bg-white/70 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--muted)]">Attempt status</span>
            <span className="font-semibold text-[var(--foreground)]">
              {attempt.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--muted)]">Provider intent</span>
            <span className="font-mono text-xs text-[var(--foreground)]">
              {attempt.providerPaymentIntentId ?? "pending"}
            </span>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-[24px] border border-[rgba(18,102,79,0.16)] bg-[rgba(18,102,79,0.06)] px-4 py-3 text-sm text-[rgba(18,102,79,0.88)]">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[24px] border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-sm text-[var(--accent)]">
          {errorMessage}
        </div>
      ) : null}

      {canCreateAttempt ? (
        <Button
          className="w-full"
          disabled={pendingAction !== null}
          onClick={handleCreateAttempt}
          type="button"
        >
          {pendingAction === "create"
            ? "Preparing payment..."
            : "Create payment attempt"}
        </Button>
      ) : null}

      {canConfirmAttempt ? (
        <div className="grid gap-3">
          {(Object.keys(scenarioLabels) as PaymentScenario[]).map((scenario) => (
            <Button
              key={scenario}
              className="w-full"
              disabled={pendingAction !== null}
              onClick={() => handleConfirmAttempt(scenario)}
              type="button"
              variant={scenario === "success" ? "primary" : "secondary"}
            >
              {pendingAction === scenario
                ? "Submitting..."
                : scenarioLabels[scenario]}
            </Button>
          ))}
        </div>
      ) : null}

      {orderNumber ? (
        <Link
          className="inline-flex w-full items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
          href={`/checkout/confirmation/${encodeURIComponent(orderNumber)}`}
        >
          View order confirmation
        </Link>
      ) : null}
    </div>
  );
}
