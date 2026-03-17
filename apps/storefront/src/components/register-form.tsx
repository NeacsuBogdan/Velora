"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Panel } from "@velora/ui";
import Link from "next/link";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";

import {
  registerFormSchema,
  type RegisterFormValues
} from "../lib/register-schema";

interface RegisterFormProps {
  defaultRedirectPath?: string;
}

export function RegisterForm({
  defaultRedirectPath = "/account"
}: RegisterFormProps = {}): React.JSX.Element {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            password: values.password
          })
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;

          setErrorMessage(
            errorBody?.message ??
              "Registration failed. Verify the API is running and try again."
          );
          setIsPending(false);
          return;
        }

        await response.json().catch(() => null);
        const requestedRedirect = searchParams.get("from");

        window.location.assign(requestedRedirect ?? defaultRedirectPath);
      } catch {
        setErrorMessage(
          "The storefront cannot reach the API right now. Start `pnpm dev:api` and refresh this page before trying again."
        );
        setIsPending(false);
      }
    });
  });

  return (
    <Panel className="w-full max-w-xl">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-[var(--foreground)]"
              htmlFor="first-name"
            >
              First name
            </label>
            <input
              autoComplete="given-name"
              className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
              id="first-name"
              type="text"
              {...form.register("firstName")}
            />
            {form.formState.errors.firstName ? (
              <p className="text-sm text-[var(--accent)]">
                {form.formState.errors.firstName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-[var(--foreground)]"
              htmlFor="last-name"
            >
              Last name
            </label>
            <input
              autoComplete="family-name"
              className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
              id="last-name"
              type="text"
              {...form.register("lastName")}
            />
            {form.formState.errors.lastName ? (
              <p className="text-sm text-[var(--accent)]">
                {form.formState.errors.lastName.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="register-email"
          >
            Email
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
            id="register-email"
            type="email"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-[var(--accent)]">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-[var(--foreground)]"
              htmlFor="register-password"
            >
              Password
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
              id="register-password"
              type="password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-[var(--accent)]">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-[var(--foreground)]"
              htmlFor="register-confirm-password"
            >
              Confirm password
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
              id="register-confirm-password"
              type="password"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword ? (
              <p className="text-sm text-[var(--accent)]">
                {form.formState.errors.confirmPassword.message}
              </p>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-sm text-[var(--accent)]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-[var(--muted)]">
            This creates a customer account and signs you in immediately.
          </p>
          <Button disabled={isPending} type="submit">
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--stroke)] pt-4 text-sm">
          <Link
            className="font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            href="/"
          >
            Back to marketplace
          </Link>
          <Link
            className="font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--accent)]"
            href="/login"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </form>
    </Panel>
  );
}
