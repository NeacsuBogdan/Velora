import Link from "next/link";

import { Badge, Button, Panel, StatTile } from "@velora/ui";

const featuredCategories = [
  {
    title: "Phones & Wearables",
    description: "Flagship devices, accessories, and everyday essentials."
  },
  {
    title: "Home & Kitchen",
    description: "Reliable appliances, smart home gear, and compact upgrades."
  },
  {
    title: "Gaming & Entertainment",
    description: "Consoles, peripherals, and premium leisure equipment."
  }
];

const platformAreas = [
  "Storefront UX",
  "Admin operations",
  "Seller workflows",
  "Search projections",
  "Payments and webhooks",
  "Inventory reservations"
];

export default function HomePage(): React.JSX.Element {
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
          <Link href="/">Categories</Link>
          <Link href="/">Search</Link>
          <Link href="/">Account</Link>
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
              Velora starts with clean product boundaries, enforceable contracts,
              and infrastructure that already anticipates inventory, search,
              payments, and operational back-office work.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button>Browse foundation</Button>
            <Button variant="secondary">Account shell</Button>
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
                label="Apps"
                value="3"
                detail="Storefront, admin, and API shells are in the workspace."
              />
              <StatTile
                className="border-white/10 bg-white/8 text-white"
                label="Shared packages"
                value="5"
                detail="UI, config, contracts, domain, and test utilities."
              />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
              <p className="text-sm font-semibold text-white/90">
                Architecture direction
              </p>
              <ul className="mt-3 grid gap-2 text-sm text-white/70">
                {platformAreas.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 pb-10 md:grid-cols-3">
        {featuredCategories.map((category) => (
          <Panel key={category.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Featured category
            </p>
            <h2 className="mt-4 font-[var(--font-heading)] text-2xl font-bold tracking-tight">
              {category.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {category.description}
            </p>
          </Panel>
        ))}
      </section>
    </main>
  );
}
