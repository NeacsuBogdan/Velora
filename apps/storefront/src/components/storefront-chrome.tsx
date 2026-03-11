import { StorefrontHeader } from "./storefront-header";

export function StorefrontChrome({
  children
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
      <StorefrontHeader />
      {children}
      <footer className="pb-8 pt-2 text-sm text-[var(--muted)]">
        Built around seeded catalog data, role-aware account flows, and an
        OpenSearch-ready browsing surface.
      </footer>
    </main>
  );
}
