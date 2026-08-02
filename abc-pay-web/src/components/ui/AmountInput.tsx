"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  currency?: string;
}

/**
 * Saisie de montant XXL (Sora 800 32px) avec devise — cf. .amt-input-row du MVP.
 * inputMode="decimal" pour le clavier numérique mobile.
 */
export function AmountInput({ currency = "$", className, ...props }: AmountInputProps) {
  return (
    <div className="my-1 flex items-baseline gap-1.5 border-b-2 border-gray-100 py-2.5 focus-within:border-blue-500">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="0"
        className={cn(
          "flex-1 border-none bg-transparent p-0 font-display text-[32px] font-extrabold text-ink",
          "placeholder:text-gray-300 focus:outline-none",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className,
        )}
        {...props}
      />
      <span className="font-display text-[22px] font-bold text-gray-500">{currency}</span>
    </div>
  );
}
