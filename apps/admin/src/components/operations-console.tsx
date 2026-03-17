"use client";

import type { AdminOperationsOverview } from "@velora/contracts";
import { Button, StatTile } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { apiUrl } from "../lib/api-url";
import { SectionShell, TableShell } from "./admin-primitives";
import { StatusPill } from "./status-pill";

export function OperationsConsole({
  initialOperations
}: {
  initialOperations: AdminOperationsOverview;
}) {
  const router = useRouter();
  const [operations, setOperations] = useState(initialOperations);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function refreshOperations() {
    const response = await fetch(`${apiUrl}/admin/operations`, {
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("Operational metrics refresh failed.");
      return;
    }

    setOperations((await response.json()) as AdminOperationsOverview);
  }

  function handleReindex() {
    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const response = await fetch(`${apiUrl}/admin/operations/reindex`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          scope: "catalog-full"
        })
      });

      if (!response.ok) {
        setErrorMessage("Full reindex failed.");
        setIsPending(false);
        return;
      }

      setStatusMessage("Full catalog reindex completed.");
      await refreshOperations();
      setIsPending(false);
      router.refresh();
    });
  }

  function handleReleaseReservations() {
    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const response = await fetch(
        `${apiUrl}/admin/operations/release-expired-reservations`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (!response.ok) {
        setErrorMessage("Expired reservation cleanup failed.");
        setIsPending(false);
        return;
      }

      const result = (await response.json()) as {
        releasedReservations: number;
      };
      setStatusMessage(
        `Expired reservation cleanup released ${result.releasedReservations} reservations.`
      );
      await refreshOperations();
      setIsPending(false);
      router.refresh();
    });
  }

  return (
    <SectionShell
      description="Run search repair actions, monitor projection health, and keep operational audit signals visible to the admin team."
      eyebrow="Operations"
      id="operations"
      title="Operational tools"
    >
      <div className="grid gap-5 md:grid-cols-3">
        <StatTile
          detail="Indexed product projections available for OpenSearch-backed storefront queries."
          label="Search documents"
          value={String(operations.metrics.searchDocuments)}
        />
        <StatTile
          detail="Queued and historical reindex executions recorded for operator review."
          label="Reindex jobs"
          value={String(operations.metrics.reindexJobs)}
        />
        <StatTile
          detail="Active stock reservations that still tie up inventory capacity."
          label="Active reservations"
          value={String(operations.metrics.activeReservations)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isPending} onClick={handleReindex} type="button">
          {isPending ? "Working..." : "Run full reindex"}
        </Button>
        <Button
          disabled={isPending}
          onClick={handleReleaseReservations}
          type="button"
          variant="secondary"
        >
          Release expired reservations
        </Button>
      </div>

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

      <div className="grid gap-6 xl:grid-cols-2">
        <TableShell>
          <table className="min-w-full border-collapse bg-white">
            <thead className="bg-[rgba(15,23,42,0.04)] text-left text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Recent reindex jobs</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Requested by</th>
              </tr>
            </thead>
            <tbody>
              {operations.recentReindexJobs.map((job) => (
                <tr className="border-t border-[var(--stroke)] text-sm" key={job.jobId}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[var(--foreground)]">{job.scope}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {new Date(job.createdAt).toLocaleString("en-GB")}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill value={job.status} />
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">
                    {job.requestedByEmail ?? "System"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>

        <TableShell>
          <table className="min-w-full border-collapse bg-white">
            <thead className="bg-[rgba(15,23,42,0.04)] text-left text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Projection health</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {operations.recentSyncLogs.map((log) => (
                <tr className="border-t border-[var(--stroke)] text-sm" key={log.logId}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[var(--foreground)]">
                      {log.documentId ?? "Projection event"}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                      {log.message ?? "No message"} -{" "}
                      {new Date(log.createdAt).toLocaleString("en-GB")}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill value={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </div>
    </SectionShell>
  );
}
