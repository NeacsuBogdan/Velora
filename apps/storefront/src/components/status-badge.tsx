import { Badge } from "@velora/ui";

import { formatStatusLabel } from "../lib/status-label";

const toneByStatus: Record<string, string> = {
  ACTIVE:
    "border-[rgba(18,102,79,0.18)] bg-[rgba(18,102,79,0.08)] text-[rgba(18,102,79,0.92)]",
  COMPLETED:
    "border-[rgba(18,102,79,0.18)] bg-[rgba(18,102,79,0.08)] text-[rgba(18,102,79,0.92)]",
  PAID:
    "border-[rgba(18,102,79,0.18)] bg-[rgba(18,102,79,0.08)] text-[rgba(18,102,79,0.92)]",
  PROCESSING:
    "border-[rgba(18,102,79,0.18)] bg-[rgba(18,102,79,0.08)] text-[rgba(18,102,79,0.92)]",
  SHIPPED:
    "border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.08)] text-[rgba(37,99,235,0.92)]",
  SUCCEEDED:
    "border-[rgba(18,102,79,0.18)] bg-[rgba(18,102,79,0.08)] text-[rgba(18,102,79,0.92)]",
  STARTED:
    "border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.08)] text-[rgba(180,83,9,0.92)]",
  PAYMENT_PENDING:
    "border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.08)] text-[rgba(180,83,9,0.92)]",
  PENDING:
    "border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.08)] text-[rgba(180,83,9,0.92)]",
  REQUIRES_ACTION:
    "border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.08)] text-[rgba(180,83,9,0.92)]",
  FAILED:
    "border-[rgba(185,28,28,0.18)] bg-[rgba(185,28,28,0.08)] text-[rgba(153,27,27,0.92)]",
  CANCELED:
    "border-[rgba(107,114,128,0.18)] bg-[rgba(107,114,128,0.08)] text-[rgba(75,85,99,0.92)]",
  REFUNDED:
    "border-[rgba(107,114,128,0.18)] bg-[rgba(107,114,128,0.08)] text-[rgba(75,85,99,0.92)]",
  PARTIALLY_REFUNDED:
    "border-[rgba(107,114,128,0.18)] bg-[rgba(107,114,128,0.08)] text-[rgba(75,85,99,0.92)]"
};

export function StatusBadge({
  value
}: {
  value: string;
}): React.JSX.Element {
  return (
    <Badge
      className={toneByStatus[value] ?? "border-[var(--stroke)] bg-white/80 text-[var(--muted)]"}
    >
      {formatStatusLabel(value)}
    </Badge>
  );
}
