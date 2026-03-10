import * as React from "react";

import { cn } from "./cn";

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  detail: string;
}

export function StatTile({
  className,
  detail,
  label,
  value,
  ...props
}: StatTileProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--stroke)] bg-white p-5",
        className
      )}
      {...props}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}
