"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { OrderStatus, UpdateSellerOrderStatusRequest } from "@velora/contracts";
import { updateSellerOrderStatusRequestSchema } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { formatStatusLabel } from "../lib/status-label";

type SellerOrderStatusFormProps = {
  orderNumber: string;
  currentStatus: OrderStatus;
  availableNextStatuses: OrderStatus[];
  canManageStatus: boolean;
  statusManagementNote: string | null;
};

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as {
      error?: string;
      message?: string | string[];
    };

    if (Array.isArray(payload.message) && payload.message.length > 0) {
      return payload.message.join(" ");
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function SellerOrderStatusForm({
  orderNumber,
  currentStatus,
  availableNextStatuses,
  canManageStatus,
  statusManagementNote
}: SellerOrderStatusFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<UpdateSellerOrderStatusRequest>({
    resolver: zodResolver(updateSellerOrderStatusRequestSchema),
    defaultValues: {
      status: availableNextStatuses[0] ?? currentStatus,
      note: null
    }
  });
  const selectedStatus = useWatch({
    control: form.control,
    name: "status"
  });

  const handleSubmit = form.handleSubmit((values) => {
    setIsPending(true);
    setStatusMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/seller/orders/${orderNumber}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        setErrorMessage(
          await readApiErrorMessage(response, "Seller order update failed.")
        );
        setIsPending(false);
        return;
      }

      setStatusMessage("Seller fulfillment status updated.");
      setIsPending(false);
      router.refresh();
    });
  });

  if (!canManageStatus) {
    return (
      <div className="rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Fulfillment controls
        </p>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          {statusManagementNote ??
            "This order cannot be moved further from the seller workspace."}
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5"
      onSubmit={handleSubmit}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Fulfillment controls
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          {statusManagementNote}
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
        Next status
        <select
          className="rounded-[18px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--foreground)]"
          {...form.register("status")}
        >
          {availableNextStatuses.map((status) => (
            <option key={status} value={status}>
              {formatStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
        Operational note
        <textarea
          className="min-h-28 rounded-[18px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--foreground)]"
          placeholder="Packed, handed to courier, or delivery completed."
          {...form.register("note", {
            setValueAs: (value) => (value ? value : null)
          })}
        />
      </label>

      <Button disabled={isPending} type="submit">
        {isPending
          ? "Saving..."
          : `Mark as ${formatStatusLabel(selectedStatus ?? currentStatus)}`}
      </Button>

      {errorMessage ? (
        <p className="rounded-[18px] border border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.05)] px-4 py-3 text-sm text-[rgb(185,28,28)]">
          {errorMessage}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="rounded-[18px] border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)] px-4 py-3 text-sm text-[var(--accent)]">
          {statusMessage}
        </p>
      ) : null}
    </form>
  );
}
