"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AdminSellerSummary,
  UpdateAdminSellerRequest
} from "@velora/contracts";
import { updateAdminSellerRequestSchema } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { apiUrl } from "../lib/api-url";
import {
  FieldShell,
  InputClassName,
  ListScrollClassName,
  ListCardButton,
  SectionShell,
  SplitPanel
} from "./admin-primitives";
import { StatusPill } from "./status-pill";

function toFormValues(seller: AdminSellerSummary | null): UpdateAdminSellerRequest {
  return {
    displayName: seller?.displayName ?? "",
    legalName: seller?.legalName ?? "",
    contactEmail: seller?.contactEmail ?? "",
    status: seller?.status ?? "ACTIVE"
  };
}

export function SellerManager({
  initialSellers
}: {
  initialSellers: AdminSellerSummary[];
}) {
  const router = useRouter();
  const [sellers, setSellers] = useState(initialSellers);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(
    initialSellers[0]?.sellerId ?? null
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ACTIVE" | "SUSPENDED">(
    "ALL"
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const selectedSeller =
    sellers.find((seller) => seller.sellerId === selectedSellerId) ?? null;
  const form = useForm<UpdateAdminSellerRequest>({
    resolver: zodResolver(updateAdminSellerRequestSchema),
    defaultValues: toFormValues(selectedSeller)
  });

  useEffect(() => {
    form.reset(toFormValues(selectedSeller));
  }, [form, selectedSeller]);

  async function refreshSellers(nextQuery = query, nextStatus = statusFilter) {
    const searchParams = new URLSearchParams();

    if (nextQuery.trim()) {
      searchParams.set("q", nextQuery.trim());
    }

    if (nextStatus !== "ALL") {
      searchParams.set("status", nextStatus);
    }

    const response = await fetch(`${apiUrl}/admin/sellers?${searchParams.toString()}`, {
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("Seller list refresh failed.");
      return;
    }

    const nextSellers = (await response.json()) as AdminSellerSummary[];
    setSellers(nextSellers);
    setSelectedSellerId((current) =>
      nextSellers.some((seller) => seller.sellerId === current)
        ? current
        : nextSellers[0]?.sellerId ?? null
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedSellerId) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const response = await fetch(`${apiUrl}/admin/sellers/${selectedSellerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        setErrorMessage(
          "Seller changes could not be saved. Verify the contact email is unique."
        );
        setIsPending(false);
        return;
      }

      const savedSeller = (await response.json()) as AdminSellerSummary;
      setSellers((current) =>
        current.map((seller) =>
          seller.sellerId === savedSeller.sellerId ? savedSeller : seller
        )
      );
      setStatusMessage("Seller updated.");
      setIsPending(false);
      router.refresh();
    });
  });

  return (
    <SectionShell
      description="Update merchant identity and lifecycle state while keeping listing visibility and search exposure aligned with seller status."
      eyebrow="Marketplace supply"
      id="sellers"
      title="Seller management"
    >
      <SplitPanel
        aside={
          <>
            <div>
              <h3 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
                Seller roster
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Manage onboarding and suspension without leaving the backoffice.
              </p>
            </div>

            <div className="grid gap-3">
              <input
                className={InputClassName()}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search seller or contact"
                value={query}
              />
              <div className="flex gap-3">
                <select
                  className={InputClassName()}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "ALL" | "PENDING" | "ACTIVE" | "SUSPENDED"
                    )
                  }
                  value={statusFilter}
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <Button onClick={() => void refreshSellers()} type="button" variant="secondary">
                  Filter
                </Button>
              </div>
            </div>

            <div className={ListScrollClassName()}>
              {sellers.map((seller) => (
                <ListCardButton
                  active={seller.sellerId === selectedSellerId}
                  key={seller.sellerId}
                  onClick={() => setSelectedSellerId(seller.sellerId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {seller.displayName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {seller.slug}
                      </p>
                    </div>
                    <StatusPill value={seller.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {seller.contactEmail}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {seller.activeListings} active listings - {seller.lowStockListings} low stock
                  </p>
                </ListCardButton>
              ))}
            </div>
          </>
        }
      >
        <form className="grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <FieldShell
              error={form.formState.errors.displayName?.message}
              label="Display name"
            >
              <input className={InputClassName()} {...form.register("displayName")} />
            </FieldShell>
            <FieldShell
              error={form.formState.errors.legalName?.message}
              label="Legal name"
            >
              <input className={InputClassName()} {...form.register("legalName")} />
            </FieldShell>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FieldShell
              error={form.formState.errors.contactEmail?.message}
              label="Contact email"
            >
              <input className={InputClassName()} {...form.register("contactEmail")} />
            </FieldShell>
            <FieldShell label="Seller status">
              <select className={InputClassName()} {...form.register("status")}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING">PENDING</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </FieldShell>
          </div>

          {selectedSeller ? (
            <div className="rounded-[24px] border border-[var(--stroke)] bg-[rgba(15,23,42,0.02)] px-5 py-5 text-sm text-[var(--muted)]">
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Owner
                  </p>
                  <p className="mt-2 text-[var(--foreground)]">
                    {selectedSeller.ownerUserEmail ?? "No linked owner"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Listings
                  </p>
                  <p className="mt-2 text-[var(--foreground)]">{selectedSeller.listingCount}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Active
                  </p>
                  <p className="mt-2 text-[var(--foreground)]">{selectedSeller.activeListings}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Low stock
                  </p>
                  <p className="mt-2 text-[var(--foreground)]">
                    {selectedSeller.lowStockListings}
                  </p>
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
              Suspended sellers are removed from public search exposure until they
              return to an active operating state.
            </p>
            <Button disabled={isPending || !selectedSellerId} type="submit">
              {isPending ? "Saving..." : "Update seller"}
            </Button>
          </div>
        </form>
      </SplitPanel>
    </SectionShell>
  );
}
