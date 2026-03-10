import * as React from "react";

import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-white shadow-[0_16px_40px_rgba(215,38,56,0.25)] hover:bg-[var(--accent-dark)]",
  secondary:
    "border border-[var(--stroke)] bg-white text-[var(--foreground)] hover:border-[var(--foreground)]",
  ghost: "text-[var(--foreground)] hover:bg-black/5"
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
