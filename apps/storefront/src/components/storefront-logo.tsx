import Image from "next/image";
import Link from "next/link";

type StorefrontLogoProps = {
  href?: string;
  showTagline?: boolean;
  tone?: "light" | "dark";
};

export function StorefrontLogo({
  href = "/",
  showTagline = true,
  tone = "light"
}: StorefrontLogoProps): React.JSX.Element {
  const titleClass =
    tone === "light" ? "text-white" : "text-[var(--foreground)]";
  const subtitleClass =
    tone === "light" ? "text-white/60" : "text-[var(--muted)]";
  const shellClass =
    tone === "light"
      ? "border-white/12 bg-white/10 shadow-[0_12px_34px_rgba(8,3,26,0.36)]"
      : "border-[var(--stroke)] bg-white/70 shadow-[0_16px_34px_rgba(34,18,70,0.08)]";

  return (
    <Link className="inline-flex items-center gap-3" href={href}>
      <span
        className={`inline-flex h-14 w-14 items-center justify-center rounded-[20px] border backdrop-blur ${shellClass}`}
      >
        <Image
          alt="Velora"
          className="h-9 w-9"
          height={36}
          src="/brand/velora-logo-singlepiece.svg"
          width={36}
        />
      </span>
      <span className="grid gap-1">
        <span
          className={`font-[var(--font-heading)] text-3xl font-extrabold tracking-tight ${titleClass}`}
        >
          Velora
        </span>
        {showTagline ? (
          <span
            className={`text-xs font-medium uppercase tracking-[0.28em] ${subtitleClass}`}
          >
            Curated marketplace platform
          </span>
        ) : null}
      </span>
    </Link>
  );
}
