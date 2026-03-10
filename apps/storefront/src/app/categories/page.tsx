import Link from "next/link";

import { Badge, Panel } from "@velora/ui";

import { OverviewPanel } from "../../components/overview-panel";
import { getDomainOverview } from "../../lib/storefront-api";

const categoryHighlights = [
  {
    title: "Electronics",
    description: "Seeded categories already available through the catalog API."
  },
  {
    title: "Promotions",
    description: "Discount metadata is exposed early so the browsing shell can evolve around pricing clarity."
  },
  {
    title: "Search sync",
    description: "Search projection records are already tracked at the API level for later listing expansion."
  }
];

const primaryLinkClass =
  "inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(215,38,56,0.25)] transition-colors hover:bg-[var(--accent-dark)]";

export default async function CategoriesPage(): Promise<React.JSX.Element> {
  const [catalogOverview, promotionOverview] = await Promise.all([
    getDomainOverview("/catalog/overview"),
    getDomainOverview("/promotions/overview")
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
      <header className="flex flex-col gap-5 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,32,47,0.08)] backdrop-blur">
        <Badge>Category browsing shell</Badge>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-[var(--font-heading)] text-4xl font-bold tracking-tight">
              Build the browsing surface around real catalog signals.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Stage 2 uses the live catalog and promotion overviews from the API
              so the storefront shell already speaks to real commerce data.
            </p>
          </div>
          <Link className={primaryLinkClass} href="/login">
            Customer login
          </Link>
        </div>
      </header>

      <section className="grid gap-5 py-8 md:grid-cols-3">
        {categoryHighlights.map((item) => (
          <Panel key={item.title}>
            <h2 className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
              {item.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {item.description}
            </p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-5 pb-10 md:grid-cols-2">
        <OverviewPanel
          title="Catalog metrics"
          eyebrow="Category feed"
          overview={catalogOverview}
          emptyCopy="Catalog metrics are unavailable until the API responds."
        />
        <OverviewPanel
          title="Promotion metrics"
          eyebrow="Pricing feed"
          overview={promotionOverview}
          emptyCopy="Promotion metrics are unavailable until the API responds."
        />
      </section>
    </main>
  );
}
