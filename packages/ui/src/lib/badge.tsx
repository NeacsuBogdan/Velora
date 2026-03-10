import * as React from "react";

import { cn } from "./cn";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

export function Badge({
  className,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--stroke)] bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)] backdrop-blur",
        className
      )}
      {...props}
    />
  );
}
