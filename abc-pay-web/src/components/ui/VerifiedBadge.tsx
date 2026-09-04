import { cn } from "@/lib/cn";

/**
 * Badge « Verified » (style Twitter/X) — pastille bleue à coche blanche. Affiché à côté du
 * nom d'un établissement dont l'identité (KYC) et les documents (KYB) sont validés par abc pay.
 */
export function VerifiedSeal({
  size = 16,
  className,
  title = "Établissement vérifié par abc pay",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-blue-500 text-white align-middle", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.64}
        height={size * 0.64}
        fill="none"
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}
