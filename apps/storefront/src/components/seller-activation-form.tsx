"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  SellerActivationPreview,
  SellerActivationResponse
} from "@velora/contracts";
import { Button, Panel } from "@velora/ui";
import Link from "next/link";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";

import {
  sellerActivationFormSchema,
  type SellerActivationFormValues
} from "../lib/seller-activation-schema";

export function SellerActivationForm({
  activationToken,
  preview
}: {
  activationToken: string;
  preview: SellerActivationPreview;
}): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [activatedSellerSlug, setActivatedSellerSlug] = useState<string | null>(
    null
  );

  const form = useForm<SellerActivationFormValues>({
    resolver: zodResolver(sellerActivationFormSchema),
    defaultValues: {
      firstName: preview.contactName.split(" ")[0] ?? "",
      lastName: preview.contactName.split(" ").slice(1).join(" ") ?? "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/seller-onboarding/activate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            token: activationToken,
            firstName: values.firstName,
            lastName: values.lastName,
            password: values.password
          })
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;

          setErrorMessage(
            errorBody?.message ??
              "Seller activation failed. Ask an administrator to regenerate the activation link."
          );
          setIsPending(false);
          return;
        }

        const payload = (await response.json()) as SellerActivationResponse;
        setActivatedSellerSlug(payload.sellerSlug);
        window.location.assign("/seller");
      } catch {
        setErrorMessage(
          "The storefront cannot reach the onboarding service right now. Start the API and try again."
        );
        setIsPending(false);
      }
    });
  });

  return (
    <Panel className="w-full max-w-xl">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="rounded-[24px] border border-[var(--stroke)] bg-[rgba(15,23,42,0.03)] px-5 py-4 text-sm leading-7 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">
            {preview.displayName}
          </p>
          <p className="mt-2">{preview.legalName}</p>
          <p className="mt-2">
            Activation expires on{" "}
            {new Date(preview.expiresAt).toLocaleString("en-GB")}.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={form.formState.errors.firstName?.message}
            id="seller-activation-first-name"
            label="First name"
          >
            <input
              className={inputClassName}
              id="seller-activation-first-name"
              type="text"
              {...form.register("firstName")}
            />
          </Field>
          <Field
            error={form.formState.errors.lastName?.message}
            id="seller-activation-last-name"
            label="Last name"
          >
            <input
              className={inputClassName}
              id="seller-activation-last-name"
              type="text"
              {...form.register("lastName")}
            />
          </Field>
        </div>

        <Field
          error={form.formState.errors.password?.message}
          id="seller-activation-password"
          label="Create password"
        >
          <input
            autoComplete="new-password"
            className={inputClassName}
            id="seller-activation-password"
            type="password"
            {...form.register("password")}
          />
        </Field>

        <Field
          error={form.formState.errors.confirmPassword?.message}
          id="seller-activation-confirm-password"
          label="Confirm password"
        >
          <input
            autoComplete="new-password"
            className={inputClassName}
            id="seller-activation-confirm-password"
            type="password"
            {...form.register("confirmPassword")}
          />
        </Field>

        {errorMessage ? (
          <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-sm text-[var(--accent)]">
            {errorMessage}
          </div>
        ) : null}

        {activatedSellerSlug ? (
          <div className="rounded-2xl border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)] px-4 py-3 text-sm text-[var(--accent)]">
            Seller workspace activated for <strong>{activatedSellerSlug}</strong>.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Activation creates the seller owner account and signs you into the
            merchant workspace immediately.
          </p>
          <Button disabled={isPending} type="submit">
            {isPending ? "Activating..." : "Activate seller account"}
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
            href="/seller/login"
          >
            Seller login
          </Link>
        </div>
      </form>
    </Panel>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]";

function Field({
  children,
  error,
  id,
  label
}: {
  children: React.ReactNode;
  error?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label
        className="text-sm font-semibold text-[var(--foreground)]"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
    </div>
  );
}
