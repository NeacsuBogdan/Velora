"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AdminInventoryItem,
  UpdateAdminInventoryRequest
} from "@velora/contracts";
import { updateAdminInventoryRequestSchema } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { apiUrl } from "../lib/api-url";
import {
  FieldShell,
  InputClassName,
  ListCardButton,
  SectionShell,
  SplitPanel
} from "./admin-primitives";
import { StatusPill } from "./status-pill";

function toFormValues(item: AdminInventoryItem | null): UpdateAdminInventoryRequest {
  return {
    onHand: item?.onHand ?? 0,
    safetyStock: item?.safetyStock ?? 0,
    leadTimeDays: item?.leadTimeDays ?? 2,
    note: null
  };
}

export function InventoryManager({
  initialInventory
}: {
  initialInventory: AdminInventoryItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialInventory);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | null>(
    initialInventory[0]?.inventoryItemId ?? null
  );
  const [query, setQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const selectedItem =
    items.find((item) => item.inventoryItemId === selectedInventoryItemId) ?? null;
  const form = useForm<UpdateAdminInventoryRequest>({
    resolver: zodResolver(updateAdminInventoryRequestSchema),
    defaultValues: toFormValues(selectedItem)
  });

  useEffect(() => {
    form.reset(toFormValues(selectedItem));
  }, [form, selectedItem]);

  async function refreshInventory(nextQuery = query, nextLowStock = lowStockOnly) {
    const searchParams = new URLSearchParams();

    if (nextQuery.trim()) {
      searchParams.set("q", nextQuery.trim());
    }

    if (nextLowStock) {
      searchParams.set("lowStock", "true");
    }

    const response = await fetch(`${apiUrl}/admin/inventory?${searchParams.toString()}`, {
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("Inventory list refresh failed.");
      return;
    }

    const nextItems = (await response.json()) as AdminInventoryItem[];
    setItems(nextItems);
    setSelectedInventoryItemId((current) =>
      nextItems.some((item) => item.inventoryItemId === current)
        ? current
        : nextItems[0]?.inventoryItemId ?? null
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedInventoryItemId) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const response = await fetch(
        `${apiUrl}/admin/inventory/${selectedInventoryItemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(values)
        }
      );

      if (!response.ok) {
        setErrorMessage(
          "Inventory changes could not be saved. Ensure on-hand stock stays above reserved units."
        );
        setIsPending(false);
        return;
      }

      const savedItem = (await response.json()) as AdminInventoryItem;
      setItems((current) =>
        current.map((item) =>
          item.inventoryItemId === savedItem.inventoryItemId ? savedItem : item
        )
      );
      setStatusMessage("Inventory updated.");
      setIsPending(false);
      router.refresh();
    });
  });

  return (
    <SectionShell
      description="Adjust on-hand stock, safety stock, and lead time without bypassing reservation protections or search synchronization."
      eyebrow="Inventory controls"
      id="inventory"
      title="Inventory management"
    >
      <SplitPanel
        aside={
          <>
            <div>
              <h3 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
                Inventory watchlist
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Focus on low-stock or high-priority listings.
              </p>
            </div>

            <div className="grid gap-3">
              <input
                className={InputClassName()}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search SKU, product, or seller"
                value={query}
              />
              <label className="flex items-center gap-3 rounded-[24px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm">
                <input
                  checked={lowStockOnly}
                  onChange={(event) => setLowStockOnly(event.target.checked)}
                  type="checkbox"
                />
                Only show low-stock offers
              </label>
              <Button
                onClick={() => void refreshInventory()}
                type="button"
                variant="secondary"
              >
                Refresh
              </Button>
            </div>

            <div className="grid gap-3">
              {items.map((item) => (
                <ListCardButton
                  active={item.inventoryItemId === selectedInventoryItemId}
                  key={item.inventoryItemId}
                  onClick={() => setSelectedInventoryItemId(item.inventoryItemId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {item.productTitle}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {item.sellerSku}
                      </p>
                    </div>
                    <StatusPill value={item.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {item.sellerName}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {item.availableQuantity} available · {item.reserved} reserved
                  </p>
                </ListCardButton>
              ))}
            </div>
          </>
        }
      >
        <form className="grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-5 md:grid-cols-3">
            <FieldShell
              error={form.formState.errors.onHand?.message}
              label="On-hand stock"
            >
              <input
                className={InputClassName()}
                type="number"
                {...form.register("onHand", {
                  valueAsNumber: true
                })}
              />
            </FieldShell>
            <FieldShell
              error={form.formState.errors.safetyStock?.message}
              label="Safety stock"
            >
              <input
                className={InputClassName()}
                type="number"
                {...form.register("safetyStock", {
                  valueAsNumber: true
                })}
              />
            </FieldShell>
            <FieldShell
              error={form.formState.errors.leadTimeDays?.message}
              label="Lead time (days)"
            >
              <input
                className={InputClassName()}
                type="number"
                {...form.register("leadTimeDays", {
                  valueAsNumber: true
                })}
              />
            </FieldShell>
          </div>

          <FieldShell label="Adjustment note">
            <input
              className={InputClassName()}
              {...form.register("note", {
                setValueAs: (value) => (value ? value : null)
              })}
            />
          </FieldShell>

          {selectedItem ? (
            <div className="rounded-[24px] border border-[var(--stroke)] bg-[rgba(15,23,42,0.02)] px-5 py-5 text-sm text-[var(--muted)]">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Product
                  </p>
                  <p className="mt-2 text-[var(--foreground)]">{selectedItem.productTitle}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Seller
                  </p>
                  <p className="mt-2 text-[var(--foreground)]">{selectedItem.sellerName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Reserved now
                  </p>
                  <p className="mt-2 text-[var(--foreground)]">{selectedItem.reserved} units</p>
                </div>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[24px] border border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.05)] px-4 py-3 text-sm text-[rgb(185,28,28)]">
              {errorMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="rounded-[24px] border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)] px-4 py-3 text-sm text-[var(--accent)]">
              {statusMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm leading-7 text-[var(--muted)]">
              Reservation-safe updates are audited and immediately reflected in
              search availability metadata.
            </p>
            <Button disabled={isPending || !selectedInventoryItemId} type="submit">
              {isPending ? "Saving..." : "Update inventory"}
            </Button>
          </div>
        </form>
      </SplitPanel>
    </SectionShell>
  );
}
