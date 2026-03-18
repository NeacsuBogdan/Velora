"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Panel } from "@velora/ui";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  checkoutFormSchema,
  type CheckoutFormValues
} from "../lib/checkout-form-schema";

interface CheckoutSessionFormProps {
  defaultValues: CheckoutFormValues;
  isSignedIn: boolean;
}

function FieldError({ message }: { message?: string }): React.JSX.Element | null {
  return message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null;
}

function InputField({
  id,
  label,
  autoComplete,
  register,
  error,
  type = "text"
}: {
  id: string;
  label: string;
  autoComplete?: string;
  register: ReturnType<typeof useForm<CheckoutFormValues>>["register"];
  error?: string;
  type?: string;
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
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
        id={id}
        type={type}
        {...register(id as keyof CheckoutFormValues)}
      />
      <FieldError message={error} />
    </div>
  );
}

export function CheckoutSessionForm({
  defaultValues,
  isSignedIn
}: CheckoutSessionFormProps): React.JSX.Element {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues
  });

  const onSubmit = form.handleSubmit((values) => {
    setIsPending(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/commerce/checkout/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            customer: {
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email,
              phone: values.contactPhone || undefined
            },
            deliveryAddress: {
              fullName: values.fullName,
              line1: values.line1,
              line2: values.line2 || undefined,
              city: values.city,
              state: values.state || undefined,
              postalCode: values.postalCode,
              countryCode: values.countryCode,
              phone: values.deliveryPhone || undefined
            }
          })
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;

          setErrorMessage(
            errorBody?.message ??
              "Checkout could not be started. Verify the cart contents and delivery details."
          );
          setIsPending(false);
          return;
        }

        const payload = (await response.json()) as {
          checkoutSessionId: string;
        };

        router.push(
          `/checkout?session=${encodeURIComponent(payload.checkoutSessionId)}`
        );
        router.refresh();
      } catch {
        setErrorMessage(
          "The storefront could not reach the checkout service right now."
        );
        setIsPending(false);
      }
    });
  });

  return (
    <Panel className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Delivery step
        </p>
        <div>
          <h2 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
            Capture the delivery contact before the reservation window starts.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            {isSignedIn
              ? "Your account details are prefilled where possible, but this checkout still stores an explicit delivery snapshot for the order."
              : "You can complete this order as a guest. An account is optional."}
          </p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            autoComplete="given-name"
            error={form.formState.errors.firstName?.message}
            id="firstName"
            label="Contact first name"
            register={form.register}
          />
          <InputField
            autoComplete="family-name"
            error={form.formState.errors.lastName?.message}
            id="lastName"
            label="Contact last name"
            register={form.register}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            autoComplete="email"
            error={form.formState.errors.email?.message}
            id="email"
            label="Contact email"
            register={form.register}
            type="email"
          />
          <InputField
            autoComplete="tel"
            error={form.formState.errors.contactPhone?.message}
            id="contactPhone"
            label="Contact phone"
            register={form.register}
            type="tel"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            autoComplete="shipping name"
            error={form.formState.errors.fullName?.message}
            id="fullName"
            label="Delivery full name"
            register={form.register}
          />
          <InputField
            autoComplete="country-name"
            error={form.formState.errors.countryCode?.message}
            id="countryCode"
            label="Country code"
            register={form.register}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            autoComplete="address-line1"
            error={form.formState.errors.line1?.message}
            id="line1"
            label="Address line 1"
            register={form.register}
          />
          <InputField
            autoComplete="address-line2"
            error={form.formState.errors.line2?.message}
            id="line2"
            label="Address line 2"
            register={form.register}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <InputField
            autoComplete="address-level2"
            error={form.formState.errors.city?.message}
            id="city"
            label="City"
            register={form.register}
          />
          <InputField
            autoComplete="address-level1"
            error={form.formState.errors.state?.message}
            id="state"
            label="County / state"
            register={form.register}
          />
          <InputField
            autoComplete="postal-code"
            error={form.formState.errors.postalCode?.message}
            id="postalCode"
            label="Postal code"
            register={form.register}
          />
        </div>

        <InputField
          autoComplete="tel"
          error={form.formState.errors.deliveryPhone?.message}
          id="deliveryPhone"
          label="Delivery phone"
          register={form.register}
          type="tel"
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-sm text-[var(--accent)]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--stroke)] pt-4">
          <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
            Velora creates the stock reservation only after these delivery
            details are captured, so payment and fulfilment snapshots stay
            aligned with the final order record.
          </p>
          <Button disabled={isPending} type="submit">
            {isPending ? "Starting checkout..." : "Reserve stock and continue"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

