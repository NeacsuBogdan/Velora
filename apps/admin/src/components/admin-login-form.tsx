"use client";

import { Button, Panel } from "@velora/ui";
import { startTransition, useState } from "react";

export function AdminLoginForm(): React.JSX.Element {
  const [email, setEmail] = useState("admin@velora.local");
  const [password, setPassword] = useState("Demo123!");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password
          })
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;

          setErrorMessage(
            errorBody?.message ??
              "Admin login failed. Verify the seeded credentials and API availability."
          );
          setIsPending(false);
          return;
        }

        window.location.assign("/");
      } catch {
        setErrorMessage(
          "The admin workspace cannot reach the API right now. Start the backend and try again."
        );
        setIsPending(false);
      }
    });
  }

  return (
    <Panel className="max-w-xl">
      <form className="space-y-5" onSubmit={handleLogin}>
        <div>
          <label
            className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]"
            htmlFor="admin-email"
          >
            Admin email
          </label>
          <input
            id="admin-email"
            className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </div>

        <div>
          <label
            className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]"
            htmlFor="admin-password"
          >
            Password
          </label>
          <input
            id="admin-password"
            className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-sm text-[var(--accent)]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm leading-7 text-[var(--muted)]">
            The seeded admin account unlocks the live promotion endpoints.
          </p>
          <Button disabled={isPending} type="submit">
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
