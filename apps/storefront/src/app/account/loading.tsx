import { Panel } from "@velora/ui";

export default function AccountLoading(): React.JSX.Element {
  return (
    <Panel>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        Loading account
      </p>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        Fetching your live session and account overview from the API.
      </p>
    </Panel>
  );
}
