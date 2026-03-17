import { Badge } from "@velora/ui";

import { RegisterForm } from "../../components/register-form";

export default function RegisterPage(): React.JSX.Element {
  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center lg:px-10">
      <section className="space-y-6">
        <Badge>Customer onboarding</Badge>
        <div className="space-y-5">
          <h1 className="font-[var(--font-heading)] text-5xl font-extrabold tracking-tight text-[var(--foreground)]">
            Create a Velora customer account.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Registration creates a standard customer workspace, issues the same
            session cookie used across account, cart, and checkout, and keeps
            operator roles isolated from public self-service access.
          </p>
        </div>
        <div className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,32,47,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            What you get
          </p>
          <ul className="mt-4 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            <li>Customer-only access to cart, checkout, addresses, and orders.</li>
            <li>Immediate sign-in after account creation.</li>
            <li>No overlap with admin or seller workspace permissions.</li>
          </ul>
        </div>
      </section>

      <RegisterForm />
    </main>
  );
}
