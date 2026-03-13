"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Panel } from "@velora/ui";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";

import { loginFormSchema, type LoginFormValues } from "../lib/login-schema";

interface LoginFormProps {
  defaultEmail?: string;
  defaultRedirectPath?: string;
}

export function LoginForm({
  defaultEmail = "customer@velora.local",
  defaultRedirectPath = "/account"
}: LoginFormProps = {}): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: defaultEmail,
      password: "Demo123!"
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(values)
        }
      );

      if (!response.ok) {
        setErrorMessage(
          "The login request was rejected. Verify the API is running and the demo credentials are intact."
        );
        setIsPending(false);
        return;
      }

      router.push(searchParams.get("from") ?? defaultRedirectPath);
      router.refresh();
    });
  });

  return (
    <Panel className="w-full max-w-xl">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-[var(--accent)]">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-[var(--accent)]">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-sm text-[var(--accent)]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Demo accounts are seeded in the API database.
          </p>
          <Button disabled={isPending} type="submit">
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
