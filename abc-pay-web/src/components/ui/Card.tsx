import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Carte de base : surface gris clair, rayon 16 (cf. MVP .cat-card/.reason-card). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-gray-100 p-4", className)} {...props} />;
}

/** Variante sombre (navy) pour blocs tarif / KYC courant. */
export function CardNavy({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-grad-navy rounded-3xl p-5 text-white", className)}
      {...props}
    />
  );
}
