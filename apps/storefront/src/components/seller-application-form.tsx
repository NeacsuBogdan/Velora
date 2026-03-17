"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SellerApplicationReceipt } from "@velora/contracts";
import { Button, Panel } from "@velora/ui";
import Link from "next/link";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";

import {
  sellerApplicationFormSchema,
  type SellerApplicationFormValues
} from "../lib/seller-application-schema";

export function SellerApplicationForm(): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState<SellerApplicationReceipt | null>(null);

  const form = useForm<SellerApplicationFormValues>({
    resolver: zodResolver(sellerApplicationFormSchema),
    defaultValues: {
      displayName: "",
      legalName: "",
      contactFirstName: "",
      contactLastName: "",
      contactEmail: "",
      contactPhone: "",
      websiteUrl: "",
      catalogSummary: "",
      notes: ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/seller-onboarding/applications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...values,
            websiteUrl: values.websiteUrl || undefined,
            notes: values.notes || undefined
          })
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;

          setErrorMessage(
            errorBody?.message ??
              "The merchant application could not be submitted. Review the company details and try again."
          );
          setIsPending(false);
          return;
        }

        setReceipt((await response.json()) as SellerApplicationReceipt);
        form.reset();
        setIsPending(false);
      } catch {
        setErrorMessage(
          "The storefront cannot reach the onboarding service right now. Start the API and try again."
        );
        setIsPending(false);
      }
    });
  });

  return (
    <Panel className="w-full max-w-2xl">
      {receipt ? (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Application received
            </p>
            <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-semibold tracking-tight">
              Merchant onboarding request submitted.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Your application id is{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {receipt.applicationId}
              </span>
              . Admin review will generate a seller activation link once the
              marketplace team approves the request.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--stroke)] bg-[rgba(15,23,42,0.03)] px-5 py-4 text-sm leading-7 text-[var(--muted)]">
            {receipt.message}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--stroke)] pt-4">
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
        </div>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              error={form.formState.errors.displayName?.message}
              id="seller-display-name"
              label="Store or seller name"
              hint="Use the trading name merchants will recognize. This does not need to be a standalone website."
            >
              <input
                className={inputClassName}
                id="seller-display-name"
                placeholder="Peak Labs"
                type="text"
                {...form.register("displayName")}
              />
            </Field>
            <Field
              error={form.formState.errors.legalName?.message}
              id="seller-legal-name"
              label="Legal company name"
            >
              <input
                className={inputClassName}
                id="seller-legal-name"
                placeholder="Peak Labs SRL"
                type="text"
                {...form.register("legalName")}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              error={form.formState.errors.contactFirstName?.message}
              id="seller-contact-first-name"
              label="Contact first name"
            >
              <input
                className={inputClassName}
                id="seller-contact-first-name"
                type="text"
                {...form.register("contactFirstName")}
              />
            </Field>
            <Field
              error={form.formState.errors.contactLastName?.message}
              id="seller-contact-last-name"
              label="Contact last name"
            >
              <input
                className={inputClassName}
                id="seller-contact-last-name"
                type="text"
                {...form.register("contactLastName")}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              error={form.formState.errors.contactEmail?.message}
              id="seller-contact-email"
              label="Business email"
            >
              <input
                className={inputClassName}
                id="seller-contact-email"
                type="email"
                {...form.register("contactEmail")}
              />
            </Field>
            <Field
              error={form.formState.errors.contactPhone?.message}
              id="seller-contact-phone"
              label="Phone"
            >
              <input
                className={inputClassName}
                id="seller-contact-phone"
                type="tel"
                {...form.register("contactPhone")}
              />
            </Field>
          </div>

          <Field
            error={form.formState.errors.websiteUrl?.message}
            id="seller-website-url"
            label="Website or reference link"
            hint="Optional. Leave this empty if you do not have a website, online shop, or product sheet yet."
          >
            <input
              className={inputClassName}
              id="seller-website-url"
              placeholder="https://yourshop.example"
              type="url"
              {...form.register("websiteUrl")}
            />
          </Field>

          <Field
            error={form.formState.errors.catalogSummary?.message}
            id="seller-catalog-summary"
            label="Products or categories you plan to sell"
            hint="Describe the assortment you want to bring to Velora, even if you do not have a website yet."
          >
            <textarea
              className={textAreaClassName}
              id="seller-catalog-summary"
              placeholder="Books, stationery bundles, educational toys, and gift-ready accessories for school and home."
              {...form.register("catalogSummary")}
            />
          </Field>

          <Field
            error={form.formState.errors.notes?.message}
            id="seller-notes"
            label="Operational notes"
            hint="Optional. Share courier coverage, invoicing details, or anything useful for review."
          >
            <textarea
              className={textAreaClassName}
              id="seller-notes"
              placeholder="We can ship nationally within 24 to 48 hours and already operate with invoice-ready stock."
              {...form.register("notes")}
            />
          </Field>

          {errorMessage ? (
            <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-sm text-[var(--accent)]">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-[var(--muted)]">
              A website is not required. Admin approval issues a seller
              activation link after the marketplace team reviews the business
              profile and planned assortment.
            </p>
            <Button disabled={isPending} type="submit">
              {isPending ? "Submitting..." : "Submit application"}
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
              Already approved? Seller login
            </Link>
          </div>
        </form>
      )}
    </Panel>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]";
const textAreaClassName = `${inputClassName} min-h-28 resize-y`;

function Field({
  children,
  error,
  hint,
  id,
  label
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
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
      {hint ? (
        <p className="text-sm leading-6 text-[var(--muted)]">{hint}</p>
      ) : null}
      {children}
      {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
    </div>
  );
}
