"use client";

import type { NotificationFeed } from "@velora/contracts";
import { Button, Panel } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { apiUrl } from "../lib/api-url";

function levelClassName(level: NotificationFeed["items"][number]["level"]) {
  if (level === "SUCCESS") {
    return "border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.06)]";
  }

  if (level === "WARNING") {
    return "border-[rgba(161,98,7,0.16)] bg-[rgba(245,158,11,0.08)]";
  }

  if (level === "ACTION_REQUIRED") {
    return "border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.05)]";
  }

  return "border-[var(--stroke)] bg-white";
}

export function NotificationInbox({
  initialFeed
}: {
  initialFeed: NotificationFeed;
}): React.JSX.Element {
  const router = useRouter();
  const [feed, setFeed] = useState(initialFeed);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateNotificationReadState(notificationId: string) {
    setFeed((current) => ({
      unreadCount: Math.max(
        0,
        current.unreadCount -
          (current.items.some(
            (item) => item.notificationId === notificationId && !item.isRead
          )
            ? 1
            : 0)
      ),
      items: current.items.map((item) =>
        item.notificationId === notificationId
          ? {
              ...item,
              isRead: true,
              readAt: item.readAt ?? new Date().toISOString()
            }
          : item
      )
    }));
  }

  function handleMarkRead(notificationId: string) {
    setPendingId(notificationId);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `${apiUrl}/notifications/${notificationId}/read`,
          {
            method: "PATCH",
            credentials: "include"
          }
        );

        if (!response.ok) {
          setErrorMessage("The notification could not be marked as read.");
          setPendingId(null);
          return;
        }

        updateNotificationReadState(notificationId);
        setPendingId(null);
        router.refresh();
      } catch {
        setErrorMessage("Notification updates are temporarily unavailable.");
        setPendingId(null);
      }
    });
  }

  function handleMarkAllRead() {
    setIsMarkingAll(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${apiUrl}/notifications/read-all`, {
          method: "POST",
          credentials: "include"
        });

        if (!response.ok) {
          setErrorMessage("The notification inbox could not be cleared.");
          setIsMarkingAll(false);
          return;
        }

        setFeed((current) => ({
          unreadCount: 0,
          items: current.items.map((item) => ({
            ...item,
            isRead: true,
            readAt: item.readAt ?? new Date().toISOString()
          }))
        }));
        setIsMarkingAll(false);
        router.refresh();
      } catch {
        setErrorMessage("Notification updates are temporarily unavailable.");
        setIsMarkingAll(false);
      }
    });
  }

  return (
    <Panel className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Inbox
          </p>
          <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-semibold tracking-tight">
            Notifications
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            Track important marketplace events without leaving the current
            workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
            {feed.unreadCount} unread
          </span>
          <Button
            disabled={feed.unreadCount === 0 || isMarkingAll}
            onClick={handleMarkAllRead}
            type="button"
            variant="secondary"
          >
            {isMarkingAll ? "Clearing..." : "Mark all read"}
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.05)] px-4 py-3 text-sm text-[rgb(185,28,28)]">
          {errorMessage}
        </div>
      ) : null}

      {feed.items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--stroke)] bg-[rgba(255,255,255,0.74)] px-5 py-8 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">
            No notifications yet
          </p>
          <p className="mt-2 leading-7">
            Marketplace alerts will appear here when orders, refunds, or
            account-level events need your attention.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feed.items.map((item) => (
            <div
              className={`rounded-[24px] border px-5 py-5 ${levelClassName(
                item.level
              )}`}
              key={item.notificationId}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--stroke)] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {item.kind.replace(/_/g, " ")}
                    </span>
                    {!item.isRead ? (
                      <span className="rounded-full bg-[var(--foreground)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                        Unread
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {item.message}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {item.linkUrl ? (
                    <a
                      className="inline-flex items-center justify-center rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
                      href={item.linkUrl}
                    >
                      Open
                    </a>
                  ) : null}
                  {!item.isRead ? (
                    <Button
                      disabled={pendingId === item.notificationId}
                      onClick={() => handleMarkRead(item.notificationId)}
                      type="button"
                      variant="secondary"
                    >
                      {pendingId === item.notificationId
                        ? "Saving..."
                        : "Mark read"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
