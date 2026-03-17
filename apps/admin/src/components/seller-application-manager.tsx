"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AdminSellerApplicationSummary,
  ReviewAdminSellerApplicationRequest,
  ReviewAdminSellerApplicationResponse
} from "@velora/contracts";
import { reviewAdminSellerApplicationRequestSchema } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { apiUrl } from "../lib/api-url";
import {
  EmptyState,
  FieldShell,
  InputClassName,
  ListCardButton,
  ListScrollClassName,
  SectionShell,
  SplitPanel
} from "./admin-primitives";
import { StatusPill } from "./status-pill";

function toFormValues(
  application: AdminSellerApplicationSummary | null
): ReviewAdminSellerApplicationRequest {
  return {
    decision:
      application?.status === "REJECTED"
        ? "REVIEWING"
        : application?.status === "ACTIVATION_PENDING"
          ? "APPROVE"
          : "REVIEWING",
    note: application?.reviewNote ?? undefined,
    activationWindowDays: 7
  };
}

export function SellerApplicationManager({
  initialApplications
}: {
  initialApplications: AdminSellerApplicationSummary[];
}) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(initialApplications[0]?.applicationId ?? null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    | "ALL"
    | "SUBMITTED"
    | "REVIEWING"
    | "ACTIVATION_PENDING"
    | "ACTIVATED"
    | "REJECTED"
  >("ALL");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activationLink, setActivationLink] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const selectedApplication =
    applications.find(
      (application) => application.applicationId === selectedApplicationId
    ) ?? null;
  const form = useForm<ReviewAdminSellerApplicationRequest>({
    resolver: zodResolver(reviewAdminSellerApplicationRequestSchema),
    defaultValues: toFormValues(selectedApplication)
  });
  const selectedDecision = form.watch("decision");

  useEffect(() => {
    form.reset(toFormValues(selectedApplication));
  }, [form, selectedApplication]);

  useEffect(() => {
    setActivationLink(null);
    setCopyMessage(null);
  }, [selectedApplicationId]);

  async function refreshApplications(
    nextQuery = query,
    nextStatus = statusFilter
  ) {
    const searchParams = new URLSearchParams();

    if (nextQuery.trim()) {
      searchParams.set("q", nextQuery.trim());
    }

    if (nextStatus !== "ALL") {
      searchParams.set("status", nextStatus);
    }

    const response = await fetch(
      `${apiUrl}/admin/seller-applications?${searchParams.toString()}`,
      {
        credentials: "include"
      }
    );

    if (!response.ok) {
      setErrorMessage("Seller application list refresh failed.");
      return;
    }

    const nextApplications =
      (await response.json()) as AdminSellerApplicationSummary[];
    setApplications(nextApplications);
    setSelectedApplicationId((current) =>
      nextApplications.some(
        (application) => application.applicationId === current
      )
        ? current
        : nextApplications[0]?.applicationId ?? null
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedApplicationId) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setCopyMessage(null);

    startTransition(async () => {
      const response = await fetch(
        `${apiUrl}/admin/seller-applications/${selectedApplicationId}/review`,
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
        const errorBody = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        setErrorMessage(
          errorBody?.message ??
            "Seller application review could not be saved."
        );
        setIsPending(false);
        return;
      }

      const savedApplication =
        (await response.json()) as ReviewAdminSellerApplicationResponse;
      setApplications((current) =>
        current.map((application) =>
          application.applicationId === savedApplication.applicationId
            ? savedApplication
            : application
        )
      );
      setActivationLink(savedApplication.activationLink ?? null);
      setStatusMessage(
        savedApplication.activationLink
          ? "Seller activation link generated. The application remains activation pending until the seller completes password setup."
          : "Seller application updated."
      );
      setIsPending(false);
      router.refresh();
    });
  });

  async function copyActivationLink() {
    if (!activationLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activationLink);
      setCopyMessage("Activation link copied.");
    } catch {
      setCopyMessage("Copy failed. Copy the link manually.");
    }
  }

  return (
    <SectionShell
      description="Review incoming merchant applications, move them through manual assessment, and generate activation links only after the marketplace team is ready to onboard the seller."
      eyebrow="Merchant onboarding"
      id="seller-applications"
      title="Seller application queue"
    >
      <SplitPanel
        aside={
          <>
            <div>
              <h3 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
                Pending reviews
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Separate application review from active seller account
                management.
              </p>
            </div>

            <div className="grid gap-3">
              <input
                className={InputClassName()}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search company or contact"
                value={query}
              />
              <div className="flex gap-3">
                <select
                  className={InputClassName()}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | "ALL"
                        | "SUBMITTED"
                        | "REVIEWING"
                        | "ACTIVATION_PENDING"
                        | "ACTIVATED"
                        | "REJECTED"
                    )
                  }
                  value={statusFilter}
                >
                  <option value="ALL">All statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="REVIEWING">Reviewing</option>
                  <option value="ACTIVATION_PENDING">Activation pending</option>
                  <option value="ACTIVATED">Activated</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <Button
                  onClick={() => void refreshApplications()}
                  type="button"
                  variant="secondary"
                >
                  Filter
                </Button>
              </div>
            </div>

            <div className={ListScrollClassName()}>
              {applications.map((application) => (
                <ListCardButton
                  active={application.applicationId === selectedApplicationId}
                  key={application.applicationId}
                  onClick={() =>
                    setSelectedApplicationId(application.applicationId)
                  }
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {application.displayName}
                      </p>
                      <p className="mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {application.contactEmail}
                      </p>
                    </div>
                    <StatusPill value={application.status} />
                  </div>
                  <p className="mt-3 truncate text-sm leading-6 text-[var(--muted)]">
                    {application.legalName}
                  </p>
                  <p className="mt-3 truncate text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Submitted{" "}
                    {new Date(application.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </ListCardButton>
              ))}
            </div>
          </>
        }
      >
        {selectedApplication ? (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[24px] border border-[var(--stroke)] bg-[rgba(15,23,42,0.02)] px-5 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill value={selectedApplication.status} />
                </div>
                <div className="mt-5 grid gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Contact
                    </p>
                    <p className="mt-2 text-[var(--foreground)]">
                      {selectedApplication.contactName}
                    </p>
                    <p className="text-[var(--muted)]">
                      {selectedApplication.contactEmail}
                    </p>
                    {selectedApplication.contactPhone ? (
                      <p className="text-[var(--muted)]">
                        {selectedApplication.contactPhone}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Company
                    </p>
                    <p className="mt-2 text-[var(--foreground)]">
                      {selectedApplication.legalName}
                    </p>
                    {selectedApplication.websiteUrl ? (
                      <a
                        className="text-[var(--accent)] underline-offset-4 hover:underline"
                        href={selectedApplication.websiteUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {selectedApplication.websiteUrl}
                      </a>
                    ) : (
                      <p className="text-[var(--muted)]">No website provided</p>
                    )}
                  </div>
                  {selectedApplication.sellerDisplayName ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        Activated seller
                      </p>
                      <p className="mt-2 text-[var(--foreground)]">
                        {selectedApplication.sellerDisplayName}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <form
                className="grid gap-4 rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5"
                onSubmit={onSubmit}
              >
                <FieldShell label="Decision">
                  <select className={InputClassName()} {...form.register("decision")}>
                    <option value="REVIEWING">Move to reviewing</option>
                    <option value="APPROVE">Approve and generate activation</option>
                    <option value="REJECT">Reject application</option>
                  </select>
                </FieldShell>
                <FieldShell
                  error={form.formState.errors.note?.message}
                  label="Operator note"
                >
                  <textarea
                    className={`${InputClassName()} min-h-28 resize-y`}
                    {...form.register("note")}
                  />
                </FieldShell>
                <FieldShell
                  error={form.formState.errors.activationWindowDays?.message}
                  hint="Only used when approval generates or regenerates an activation link."
                  label="Activation window (days)"
                >
                  <input
                    className={InputClassName()}
                    disabled={selectedDecision !== "APPROVE"}
                    type="number"
                    {...form.register("activationWindowDays", {
                      setValueAs: (value) =>
                        value === "" ? undefined : Number(value)
                    })}
                  />
                </FieldShell>
                <Button disabled={isPending} type="submit">
                  {isPending ? "Saving..." : "Update application"}
                </Button>
              </form>
            </div>

            <div className="rounded-[24px] border border-[var(--stroke)] bg-white px-5 py-5">
              <h4 className="font-semibold text-[var(--foreground)]">
                Catalog summary
              </h4>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {selectedApplication.catalogSummary}
              </p>
              {selectedApplication.notes ? (
                <>
                  <h4 className="mt-6 font-semibold text-[var(--foreground)]">
                    Notes
                  </h4>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    {selectedApplication.notes}
                  </p>
                </>
              ) : null}
            </div>

            {selectedApplication.status === "ACTIVATION_PENDING" ? (
              <div className="rounded-[24px] border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)] px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Waiting for seller activation
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Approval only issues the activation link. The application
                  changes to activated after the seller opens the link, sets a
                  password, and submits the activation form. Refresh the queue
                  after that step to see the final status.
                </p>
              </div>
            ) : null}

            {activationLink ? (
              <div className="rounded-[24px] border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)] px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Activation link
                </p>
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    className={InputClassName()}
                    readOnly
                    value={activationLink}
                  />
                  <Button
                    onClick={() => void copyActivationLink()}
                    type="button"
                    variant="secondary"
                  >
                    Copy link
                  </Button>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  In a production delivery this link would be sent by email.
                  For local and portfolio use, copy it directly into the seller
                  activation page. The application stays activation pending
                  until the seller submits the activation form successfully.
                </p>
                {copyMessage ? (
                  <p className="mt-2 text-sm text-[var(--accent)]">
                    {copyMessage}
                  </p>
                ) : null}
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
          </div>
        ) : (
          <EmptyState
            copy="New merchant applications will appear here as soon as someone submits the public onboarding form."
            title="No seller applications yet"
          />
        )}
      </SplitPanel>
    </SectionShell>
  );
}
