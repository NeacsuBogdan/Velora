import Link from "next/link";
import { Badge, Panel } from "@velora/ui";

import { SellerActivationForm } from "../../../components/seller-activation-form";
import { getSellerActivationPreview } from "../../../lib/storefront-api";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SellerActivationPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}): Promise<React.JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const rawToken = resolvedSearchParams.token;
  const activationToken =
    typeof rawToken === "string" && rawToken.trim().length > 0
      ? rawToken.trim()
      : null;
  const preview = activationToken
    ? await getSellerActivationPreview(activationToken)
    : null;

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)] lg:items-center lg:px-10">
      <section className="space-y-6">
        <Badge>Seller activation</Badge>
        <div className="space-y-5">
          <h1 className="font-[var(--font-heading)] text-5xl font-extrabold tracking-tight text-[var(--foreground)]">
            Activate your Velora merchant workspace.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Approved sellers finish onboarding from a secure activation link.
            This step creates the owner login, links it to the merchant profile,
            and enters the seller portal directly.
          </p>
        </div>

        {preview ? (
          <Panel className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Application summary
            </p>
            <div className="text-sm leading-7 text-[var(--muted)]">
              <p className="font-semibold text-[var(--foreground)]">
                {preview.displayName}
              </p>
              <p>{preview.legalName}</p>
              <p>{preview.contactEmail}</p>
            </div>
          </Panel>
        ) : (
          <Panel className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Link invalid
            </p>
            <p className="text-sm leading-7 text-[var(--muted)]">
              This activation link is missing, expired, or has already been
              used. Ask an administrator to regenerate a fresh seller activation
              link from the backoffice onboarding queue.
            </p>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
              href="/become-a-seller"
            >
              Apply to sell
            </Link>
          </Panel>
        )}
      </section>

      {activationToken && preview ? (
        <SellerActivationForm
          activationToken={activationToken}
          preview={preview}
        />
      ) : null}
    </main>
  );
}
