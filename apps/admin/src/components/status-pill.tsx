"use client";

const toneMap: Record<string, string> = {
  ACTIVE:
    "border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.08)] text-[var(--accent)]",
  SUCCEEDED:
    "border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.08)] text-[var(--accent)]",
  COMPLETED:
    "border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.08)] text-[var(--accent)]",
  PAID:
    "border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.08)] text-[var(--accent)]",
  PROCESSING:
    "border-[rgba(20,83,45,0.12)] bg-[rgba(34,197,94,0.08)] text-[rgb(21,128,61)]",
  SHIPPED:
    "border-[rgba(30,64,175,0.12)] bg-[rgba(59,130,246,0.08)] text-[rgb(29,78,216)]",
  REFUNDED:
    "border-[rgba(79,70,229,0.12)] bg-[rgba(99,102,241,0.08)] text-[rgb(79,70,229)]",
  PARTIALLY_REFUNDED:
    "border-[rgba(79,70,229,0.12)] bg-[rgba(99,102,241,0.08)] text-[rgb(79,70,229)]",
  PAYMENT_PENDING:
    "border-[rgba(180,83,9,0.12)] bg-[rgba(245,158,11,0.1)] text-[rgb(146,64,14)]",
  PENDING:
    "border-[rgba(180,83,9,0.12)] bg-[rgba(245,158,11,0.1)] text-[rgb(146,64,14)]",
  CREATED:
    "border-[rgba(71,85,105,0.12)] bg-[rgba(148,163,184,0.12)] text-[rgb(71,85,105)]",
  DRAFT:
    "border-[rgba(71,85,105,0.12)] bg-[rgba(148,163,184,0.12)] text-[rgb(71,85,105)]",
  STARTED:
    "border-[rgba(71,85,105,0.12)] bg-[rgba(148,163,184,0.12)] text-[rgb(71,85,105)]",
  FAILED:
    "border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.08)] text-[rgb(185,28,28)]",
  CANCELED:
    "border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.08)] text-[rgb(185,28,28)]",
  SUSPENDED:
    "border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.08)] text-[rgb(185,28,28)]",
  ARCHIVED:
    "border-[rgba(15,23,42,0.12)] bg-[rgba(15,23,42,0.05)] text-[rgb(15,23,42)]"
};

function humanize(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

export function StatusPill({
  value
}: {
  value: string | null | undefined;
}): React.JSX.Element | null {
  if (!value) {
    return null;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
        toneMap[value] ??
        "border-[rgba(15,23,42,0.1)] bg-[rgba(15,23,42,0.05)] text-[var(--foreground)]"
      }`}
    >
      {humanize(value)}
    </span>
  );
}
