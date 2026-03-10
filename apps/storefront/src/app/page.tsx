import Link from "next/link";

import { Badge, Panel, StatTile } from "@velora/ui";

import { OverviewPanel } from "../components/overview-panel";
import { getDomainOverview } from "../lib/storefront-api";

const featuredMoments = [
  "Phones & Wearables",
  "Operations-led pricing",
  "Checkout reservations"
];

const primaryLinkClass =
  "inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(215,38,56,0.25)] transition-colors hover:bg-[var(--accent-dark)]";

const secondaryLinkClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]";

export default async function HomePage(): Promise<React.JSX.Element> {
  const [catalogOverview, promotionOverview] = await Promise.all([
    getDomainOverview("/catalog/overview"),
    getDomainOverview("/promotions/overview")
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
      <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 px-6 py-5 shadow-[0_20px_60px_rgba(16,32,47,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
            Velora
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Marketplace foundation with the same discipline planned for catalog,
            checkout, search, and operations.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-[var(--muted)]">
          <Link href="/">Home</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/login">Login</Link>
          <Link href="/account">Account</Link>
        </nav>
      </header>

      <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:items-center">
        <div className="space-y-6">
          <Badge>Commerce MVP Foundation</Badge>
          <div className="space-y-5">
            <h1 className="max-w-3xl font-[var(--font-heading)] text-5xl font-extrabold tracking-tight text-[var(--foreground)] md:text-6xl">
              Build a serious marketplace before adding serious complexity.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Velora now serves live API-backed foundation data into the
              storefront shell, including catalog, promotions, and authenticated
              account surfaces.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={primaryLinkClass} href="/categories">
              Browse foundation
            </Link>
            <Link className={secondaryLinkClass} href="/account">
              Account shell
            </Link>
          </div>
        </div>

        <Panel className="overflow-hidden bg-[linear-gradient(160deg,rgba(16,32,47,0.96),rgba(40,58,77,0.96))] text-white">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              Stage 0 snapshot
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatTile
                className="border-white/10 bg-white/8 text-white"
                label="Catalog"
                value={(catalogOverview?.metrics.products ?? 0).toString()}
                detail="Products currently visible in the seeded API catalog."
              />
              <StatTile
                className="border-white/10 bg-white/8 text-white"
                label="Promotions"
                value={(promotionOverview?.metrics.activePromotions ?? 0).toString()}
                detail="Active price incentives wired into the API layer."
              />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
              <p className="text-sm font-semibold text-white/90">
                Foundation focus
              </p>
              <ul className="mt-3 grid gap-2 text-sm text-white/70">
                {featuredMoments.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 pb-10 md:grid-cols-2">
        <OverviewPanel
          title="Catalog snapshot"
          eyebrow="Live API feed"
          overview={catalogOverview}
          emptyCopy="The catalog service is unavailable. Start the API to see the live seeded categories and counts."
        />
        <OverviewPanel
          title="Promotion snapshot"
          eyebrow="Pricing surface"
          overview={promotionOverview}
          emptyCopy="Promotion metrics will appear here once the API responds."
        />
      </section>
    </main>
  );
}
