"use client";

import Link from "next/link";

import { Panel } from "@velora/ui";

interface ApiUnavailablePanelProps {
  title: string;
  message: string;
  retryHref?: string;
  retryLabel?: string;
}

const actionClassName =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";

export function ApiUnavailablePanel({
  title,
  message,
  retryHref = "/",
  retryLabel = "Back to home",
}: ApiUnavailablePanelProps): React.JSX.Element {
  return (
    <Panel className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        API unavailable
      </p>
      <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{message}</p>
      <div className="mt-6">
        <Link className={actionClassName} href={retryHref}>
          {retryLabel}
        </Link>
      </div>
    </Panel>
  );
}
