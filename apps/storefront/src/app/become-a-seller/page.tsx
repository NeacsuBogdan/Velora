import { Badge } from "@velora/ui";

import { SellerApplicationForm } from "../../components/seller-application-form";

export default function BecomeSellerPage(): React.JSX.Element {
  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(520px,1fr)] lg:items-center lg:px-10">
      <section className="space-y-6">
        <Badge>Merchant onboarding</Badge>
        <div className="space-y-5">
          <h1 className="font-[var(--font-heading)] text-5xl font-extrabold tracking-tight text-[var(--foreground)]">
            Apply to sell on Velora.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Merchant access is reviewed, approved, and activated separately from
            public customer registration. This keeps seller onboarding
            operationally controlled, role-safe, and closer to how larger
            marketplace ecosystems work.
          </p>
        </div>
        <div className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,32,47,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            What happens next
          </p>
          <ul className="mt-4 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            <li>1. Submit the merchant application with business details.</li>
            <li>2. Admin reviews the company and catalog fit.</li>
            <li>3. Approval generates a secure seller activation link.</li>
            <li>4. The seller activates the account and enters the portal.</li>
          </ul>
        </div>
      </section>

      <SellerApplicationForm />
    </main>
  );
}
