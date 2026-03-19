import { StorefrontHeader } from "./storefront-header";
import { StorefrontLogo } from "./storefront-logo";

export function StorefrontChrome({
  children
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1640px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <StorefrontHeader />
      <div className="relative flex-1">{children}</div>
      <footer className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(38,18,86,0.9),rgba(18,9,47,0.94))] px-6 py-8 text-white shadow-[0_24px_70px_rgba(8,3,26,0.34)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-4">
            <StorefrontLogo showTagline={false} />
            <p className="max-w-2xl text-sm leading-7 text-white/68">
              Velora brings seeded catalog depth, search-driven discovery,
              checkout, seller operations, and marketplace governance into one
              production-style portfolio platform.
            </p>
          </div>
          <div className="grid gap-2 text-sm text-white/60">
            <p>Catalog, cart, checkout, and seller workflows stay fully live.</p>
            <p>OpenSearch-ready browsing, role-aware auth, and seeded data intact.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
