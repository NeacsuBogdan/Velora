import { Panel } from "@velora/ui";

export default function Loading(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
      <Panel className="w-full max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Loading
        </p>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Velora is fetching the latest storefront foundation data.
        </p>
      </Panel>
    </main>
  );
}
