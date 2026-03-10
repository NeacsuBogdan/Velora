"use client";

import { Button, Panel } from "@velora/ui";

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
      <Panel className="w-full max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Unexpected error
        </p>
        <h1 className="mt-4 font-[var(--font-heading)] text-3xl font-bold tracking-tight">
          The storefront hit an unexpected failure.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Retry the current route. If the error persists, verify the API is
          reachable and the local infrastructure is running.
        </p>
        <div className="mt-6">
          <Button onClick={reset} type="button">
            Retry route
          </Button>
        </div>
      </Panel>
    </main>
  );
}
