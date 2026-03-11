import { Badge, Panel, StatTile } from "@velora/ui";

import { AdminLoginForm } from "../components/admin-login-form";
import { PromotionConsole } from "../components/promotion-console";
import {
  getPromotions,
  getPromotionsOverview,
  getSession
} from "../lib/admin-api";

export const dynamic = "force-dynamic";

export default async function AdminHomePage(): Promise<React.JSX.Element> {
  const session = await getSession();
  const isAdmin =
    session?.user.roles.some((role) => role.code === "ADMIN") ?? false;
  const [overview, promotions] = isAdmin
    ? await Promise.all([getPromotionsOverview(), getPromotions()])
    : [null, null];

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[32px] border border-[var(--stroke)] bg-[var(--surface)] p-6 shadow-[0_24px_72px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge>Admin workspace</Badge>
              <div>
                <h1 className="font-[var(--font-heading)] text-4xl font-semibold tracking-tight">
                  Promotion governance is now wired to the live pricing engine.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                  Use the seeded admin account to manage promotion rules and
                  optional coupons. Every saved change feeds the cart repricing
                  and checkout snapshot path used by the customer storefront.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--stroke)] bg-white/80 px-5 py-4 text-sm text-[var(--muted)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              {session ? (
                <>
                  Signed in as{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {session.user.email}
                  </span>
                </>
              ) : (
                "Admin session not established yet."
              )}
            </div>
          </div>
        </header>

        {isAdmin ? (
          <>
            <section className="grid gap-5 md:grid-cols-3">
              <StatTile
                detail="Promotion records loaded from the transactional source of truth."
                label="Promotions"
                value={String(overview?.metrics.promotions ?? promotions?.length ?? 0)}
              />
              <StatTile
                detail="Coupons linked to promotions and eligible for cart repricing."
                label="Coupons"
                value={String(overview?.metrics.coupons ?? 0)}
              />
              <StatTile
                detail="Currently active promotions eligible for storefront evaluation."
                label="Active"
                value={String(overview?.metrics.activePromotions ?? 0)}
              />
            </section>

            <PromotionConsole initialPromotions={promotions ?? []} />
          </>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Panel>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Access required
              </p>
              <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-semibold tracking-tight">
                Sign in with the seeded admin account to manage promotions.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                The console writes directly to the Stage 6 promotion endpoints,
                so authentication is required before rule updates and coupon
                changes can be submitted.
              </p>
            </Panel>

            <AdminLoginForm />
          </div>
        )}
      </div>
    </main>
  );
}
