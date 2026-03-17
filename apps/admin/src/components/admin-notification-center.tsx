"use client";

import type { NotificationFeed } from "@velora/contracts";
import { Button } from "@velora/ui";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { apiUrl } from "../lib/api-url";
import { SectionShell } from "./admin-primitives";

function levelClassName(level: NotificationFeed["items"][number]["level"]) {
  if (level === "SUCCESS") {
    return "border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.06)]";
  }

  if (level === "WARNING") {
    return "border-[rgba(161,98,7,0.16)] bg-[rgba(245,158,11,0.08)]";
  }

  if (level === "ACTION_REQUIRED") {
    return "border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.05)]";
  }

  return "border-[var(--stroke)] bg-white";
}

export function AdminNotificationCenter({
  initialFeed
}: {
  initialFeed: NotificationFeed;
}) {
  const router = useRouter();
  const [feed, setFeed] = useState(initialFeed);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function markLocalRead(notificationId: string) {
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
          setErrorMessage("The admin alert could not be marked as read.");
          setPendingId(null);
          return;
        }

        markLocalRead(notificationId);
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
          setErrorMessage("The admin alert queue could not be cleared.");
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
    <SectionShell
      description="High-signal marketplace alerts for onboarding, order operations, and important state transitions."
      eyebrow="Operator alerts"
      id="notifications"
      title="Notification center"
    >
      <div className="space-y-5 rounded-[32px] border border-[var(--stroke)] bg-white px-6 py-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm leading-7 text-[var(--muted)]">
              Keep operator attention on events that should not get buried in
              the larger audit trail.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[var(--stroke)] bg-[rgba(15,23,42,0.03)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
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
              No admin alerts right now
            </p>
            <p className="mt-2 leading-7">
              Seller applications, operational events, and other important
              workflow changes will surface here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {feed.items.map((item) => (
              <div
                className={`rounded-[24px] border px-5 py-5 ${levelClassName(
                  item.level
                )}`}
                key={item.notificationId}
              >
                <div className="flex h-full flex-col justify-between gap-4">
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
      </div>
    </SectionShell>
  );
}
