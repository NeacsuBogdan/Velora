import { Badge, Button, Panel, StatTile } from "@velora/ui";

const controls = [
  "Catalog readiness",
  "Order operations",
  "Inventory controls",
  "Promotion governance"
];

const pendingTracks = [
  "Auth and role enforcement",
  "Transactional schema and migrations",
  "Deterministic seeds and demo accounts",
  "Admin CRUD and operational tools"
];

export default function AdminHomePage(): React.JSX.Element {
  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[32px] border border-[var(--stroke)] bg-[var(--surface)] p-6 shadow-[0_24px_72px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge>Admin workspace</Badge>
              <div>
                <h1 className="font-[var(--font-heading)] text-4xl font-semibold tracking-tight">
                  Operational visibility starts before CRUD exists.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  The admin surface is already separated from the storefront so
                  catalog, inventory, promotions, and incident tooling can
                  evolve with clear ownership.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button>System status</Button>
              <Button variant="secondary">Stage plan</Button>
            </div>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {controls.map((item, index) => (
            <StatTile
              key={item}
              label={`Control ${index + 1}`}
              value={item}
              detail="Structured domains are already separated in the monorepo."
            />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Panel>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Delivery track
            </p>
            <div className="mt-5 grid gap-4">
              {pendingTracks.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-[var(--stroke)] bg-white px-5 py-4"
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="bg-[linear-gradient(180deg,#0f172a,#1e293b)] text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
              Next milestone
            </p>
            <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-semibold">
              Stage 1
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/70">
              Bring up the NestJS API with the transactional schema, access
              control, demo identities, and seed workflow.
            </p>
          </Panel>
        </section>
      </div>
    </main>
  );
}
