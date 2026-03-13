import type { DomainOverview } from "@velora/contracts";
import { Panel, StatTile } from "@velora/ui";

interface OverviewPanelProps {
  title: string;
  eyebrow: string;
  overview: DomainOverview | null;
  emptyCopy: string;
}

export function OverviewPanel({
  title,
  eyebrow,
  overview,
  emptyCopy,
}: OverviewPanelProps): React.JSX.Element {
  return (
    <Panel>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-[var(--font-heading)] text-2xl font-bold tracking-tight">
        {title}
      </h2>

      {overview ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Object.entries(overview.metrics).map(([label, value]) => (
              <StatTile
                key={label}
                label={label}
                value={value.toString()}
                detail="Live from the current commerce API."
              />
            ))}
          </div>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            {overview.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
          {emptyCopy}
        </p>
      )}
    </Panel>
  );
}
