"use client";

import { Panel } from "@velora/ui";

export function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-5" id={id}>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          {eyebrow}
        </p>
        <div className="space-y-2">
          <h2 className="font-[var(--font-heading)] text-3xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SplitPanel({
  aside,
  children
}: {
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Panel className="space-y-4 self-start xl:sticky xl:top-6">{aside}</Panel>
      <Panel>{children}</Panel>
    </div>
  );
}

export function FieldShell({
  label,
  hint,
  error,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-[var(--muted)]">{hint}</span> : null}
      {error ? <span className="text-xs text-[rgb(185,28,28)]">{error}</span> : null}
    </label>
  );
}

export function InputClassName() {
  return "w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]";
}

export function TextAreaClassName() {
  return `${InputClassName()} min-h-28 resize-y`;
}

export function ListScrollClassName() {
  return "grid gap-3 max-h-[34rem] overflow-y-auto pr-1";
}

export function ListCardButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition-colors ${
        active
          ? "border-[var(--accent)] bg-[rgba(15,118,110,0.08)]"
          : "border-[var(--stroke)] bg-white hover:border-[rgba(15,23,42,0.18)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  copy
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--stroke)] bg-[rgba(255,255,255,0.72)] px-5 py-8 text-sm text-[var(--muted)]">
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 leading-7">{copy}</p>
    </div>
  );
}

export function TableShell({
  children
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--stroke)]">
      <div className="max-h-[34rem] overflow-auto">{children}</div>
    </div>
  );
}
