import * as React from "react";

import { cn } from "./cn";

export type PanelProps = React.HTMLAttributes<HTMLDivElement>;

export function Panel({
  className,
  ...props
}: PanelProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--stroke)] bg-[var(--surface)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]",
        className
      )}
      {...props}
    />
  );
}
