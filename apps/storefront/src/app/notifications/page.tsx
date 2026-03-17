import { redirect } from "next/navigation";
import { Badge } from "@velora/ui";

import { NotificationInbox } from "../../components/notification-inbox";
import { getNotificationFeed, getSession } from "../../lib/storefront-api";

export const dynamic = "force-dynamic";

export default async function NotificationsPage(): Promise<React.JSX.Element> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const feed = (await getNotificationFeed(24)) ?? {
    unreadCount: 0,
    items: []
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 lg:px-10">
      <div className="space-y-6">
        <header className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,32,47,0.08)] backdrop-blur">
          <Badge>Activity center</Badge>
          <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-bold tracking-tight">
            Important actions across your Velora account
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            Customer, seller, and marketplace updates are collected here so you
            can react without guessing where the last important state change
            happened.
          </p>
        </header>

        <NotificationInbox initialFeed={feed} />
      </div>
    </main>
  );
}
