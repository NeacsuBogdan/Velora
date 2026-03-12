"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CustomerProfile } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  profileFormSchema,
  toProfileFormValues,
  type ProfileFormValues
} from "../lib/account-forms";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function AccountProfileForm({
  profile
}: {
  profile: CustomerProfile;
}): React.JSX.Element {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toProfileFormValues(profile)
  });

  useEffect(() => {
    form.reset(toProfileFormValues(profile));
  }, [form, profile]);

  const onSubmit = form.handleSubmit((values) => {
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const response = await fetch(`${apiUrl}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        setErrorMessage(
          "Profile changes could not be saved. Verify the API session is still active."
        );
        setIsPending(false);
        return;
      }

      setSuccessMessage("Profile updated.");
      setIsPending(false);
      router.refresh();
    });
  });

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="firstName">
            First name
          </label>
          <input
            id="firstName"
            className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
            {...form.register("firstName")}
          />
          {form.formState.errors.firstName ? (
            <p className="text-sm text-[var(--accent)]">
              {form.formState.errors.firstName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="lastName">
            Last name
          </label>
          <input
            id="lastName"
            className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
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
        <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="w-full rounded-2xl border border-[var(--stroke)] bg-black/3 px-4 py-3 text-sm text-[var(--muted)] outline-none"
          defaultValue={profile.email}
          disabled
        />
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-sm text-[var(--accent)]">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-[rgba(18,102,79,0.18)] bg-[rgba(18,102,79,0.05)] px-4 py-3 text-sm text-[rgba(18,102,79,0.92)]">
          {successMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-[var(--muted)]">
          Names update the live session-backed customer profile shown across the
          storefront.
        </p>
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
