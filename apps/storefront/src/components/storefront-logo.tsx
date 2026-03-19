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

  return (
    <Link className="inline-flex items-center gap-3.5" href={href}>
      <Image
        alt="Velora"
        className="h-11 w-11 drop-shadow-[0_10px_24px_rgba(17,8,44,0.24)]"
        height={44}
        src="/brand/velora-logo-singlepiece.svg"
        width={44}
      />
      <span className="grid gap-1">
        <span
          className={`font-[var(--font-heading)] text-[2.5rem] font-extrabold tracking-tight ${titleClass}`}
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
