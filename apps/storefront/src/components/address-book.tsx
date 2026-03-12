"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AddressSummary } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  type UseFormRegisterReturn,
  useForm
} from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  addressFormSchema,
  createEmptyAddressFormValues,
  toAddressFormValues,
  type AddressFormValues
} from "../lib/account-forms";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

type ComposerState =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      addressId: string;
    }
  | null;

function addressTypeLabel(type: AddressSummary["type"]) {
  return type === "SHIPPING" ? "Shipping" : "Billing";
}

function AddressTextInput({
  error,
  id,
  label,
  registration
}: {
  error?: string;
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <label
        className="text-sm font-semibold text-[var(--foreground)]"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
        {...registration}
      />
      {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
    </div>
  );
}

export function AddressBook({
  addresses
}: {
  addresses: AddressSummary[];
}): React.JSX.Element {
  const router = useRouter();
  const [composerState, setComposerState] = useState<ComposerState>(
    addresses.length ? null : { mode: "create" }
  );
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const activeAddress = useMemo(
    () =>
      composerState?.mode === "edit"
        ? addresses.find((address) => address.addressId === composerState.addressId) ??
          null
        : null,
    [addresses, composerState]
  );

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: createEmptyAddressFormValues()
  });

  useEffect(() => {
    if (activeAddress) {
      form.reset(toAddressFormValues(activeAddress));
      return;
    }

    form.reset(createEmptyAddressFormValues());
  }, [activeAddress, form]);

  const onSubmit = form.handleSubmit((values) => {
    const method = composerState?.mode === "edit" ? "PATCH" : "POST";
    const endpoint =
      composerState?.mode === "edit"
        ? `${apiUrl}/users/addresses/${composerState.addressId}`
        : `${apiUrl}/users/addresses`;

    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        setErrorMessage(
          "Address changes could not be saved. Verify the current session is still active."
        );
        setIsPending(false);
        return;
      }

      setSuccessMessage(
        composerState?.mode === "edit"
          ? "Address updated."
          : "Address added."
      );
      setComposerState(null);
      setIsPending(false);
      router.refresh();
    });
  });

  function openCreateComposer() {
    setComposerState({
      mode: "create"
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function openEditComposer(addressId: string) {
    setComposerState({
      mode: "edit",
      addressId
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function closeComposer() {
    setComposerState(addresses.length ? null : { mode: "create" });
    setErrorMessage(null);
  }

  function handleDelete(addressId: string) {
    setIsPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const response = await fetch(`${apiUrl}/users/addresses/${addressId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        setErrorMessage(
          "The address could not be removed. Verify the API session is still active."
        );
        setIsPending(false);
        return;
      }

      if (composerState?.mode === "edit" && composerState.addressId === addressId) {
        setComposerState(addresses.length > 1 ? null : { mode: "create" });
      }

      setSuccessMessage("Address removed.");
      setIsPending(false);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
              Saved addresses
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Keep shipping and billing destinations ready for faster checkout.
            </p>
          </div>
          <Button onClick={openCreateComposer} type="button" variant="secondary">
            Add address
          </Button>
        </div>

        {addresses.length ? (
          <div className="grid gap-4">
            {addresses.map((address) => (
              <article
                key={address.addressId}
                className="rounded-[28px] border border-[var(--stroke)] bg-white/85 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {address.label}
                      </p>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        {addressTypeLabel(address.type)}
                      </span>
                      {address.isDefault ? (
                        <span className="rounded-full border border-[rgba(18,102,79,0.18)] bg-[rgba(18,102,79,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(18,102,79,0.92)]">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 text-sm leading-7 text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">
                        {address.fullName}
                      </p>
                      <p>{address.line1}</p>
                      {address.line2 ? <p>{address.line2}</p> : null}
                      <p>
                        {address.city}
                        {address.state ? `, ${address.state}` : ""} {address.postalCode}
                      </p>
                      <p>{address.countryCode}</p>
                      {address.phone ? <p>{address.phone}</p> : null}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditComposer(address.addressId)}
                      type="button"
                      variant="secondary"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(address.addressId)}
                      type="button"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[var(--stroke)] bg-white/70 p-8">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              No addresses saved yet.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Add a default shipping address and an invoicing address so the
              checkout flow can prefill the next stages cleanly.
            </p>
          </div>
        )}
      </section>

      <aside className="rounded-[28px] border border-[var(--stroke)] bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Address editor
            </p>
            <h3 className="mt-3 font-[var(--font-heading)] text-2xl font-bold tracking-tight">
              {composerState?.mode === "edit" ? "Update address" : "Add address"}
            </h3>
          </div>

          {composerState ? (
            <Button onClick={closeComposer} type="button" variant="ghost">
              Reset
            </Button>
          ) : null}
        </div>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="type">
              Address type
            </label>
            <select
              id="type"
              className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
              {...form.register("type")}
            >
              <option value="SHIPPING">Shipping</option>
              <option value="BILLING">Billing</option>
            </select>
          </div>

          <AddressTextInput
            error={form.formState.errors.label?.message}
            id="label"
            label="Label"
            registration={form.register("label")}
          />
          <AddressTextInput
            error={form.formState.errors.fullName?.message}
            id="fullName"
            label="Recipient"
            registration={form.register("fullName")}
          />
          <AddressTextInput
            error={form.formState.errors.line1?.message}
            id="line1"
            label="Address line 1"
            registration={form.register("line1")}
          />
          <AddressTextInput
            error={form.formState.errors.line2?.message}
            id="line2"
            label="Address line 2"
            registration={form.register("line2")}
          />
          <AddressTextInput
            error={form.formState.errors.city?.message}
            id="city"
            label="City"
            registration={form.register("city")}
          />
          <AddressTextInput
            error={form.formState.errors.state?.message}
            id="state"
            label="State / region"
            registration={form.register("state")}
          />
          <AddressTextInput
            error={form.formState.errors.postalCode?.message}
            id="postalCode"
            label="Postal code"
            registration={form.register("postalCode")}
          />
          <AddressTextInput
            error={form.formState.errors.countryCode?.message}
            id="countryCode"
            label="Country code"
            registration={form.register("countryCode")}
          />
          <AddressTextInput
            error={form.formState.errors.phone?.message}
            id="phone"
            label="Phone"
            registration={form.register("phone")}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-[var(--stroke)] bg-white/80 px-4 py-3 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--stroke)]"
              {...form.register("isDefault")}
            />
            Mark as the default address for this type
          </label>

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

          <Button disabled={isPending} type="submit">
            {isPending
              ? "Saving..."
              : composerState?.mode === "edit"
                ? "Save address"
                : "Add address"}
          </Button>
        </form>
      </aside>
    </div>
  );
}
