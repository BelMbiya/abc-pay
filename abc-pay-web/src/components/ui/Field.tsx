"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * Champ texte du MVP (label + input gris, focus bleu).
 * Défauts sûrs : autoComplete désactivé, autoCapitalize off — l'appelant
 * réactive explicitement si nécessaire.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, id, className, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col">
      <label htmlFor={inputId} className="mb-[7px] mt-3.5 text-[12.5px] font-bold text-gray-700 first:mt-0">
        {label}
        {props.required ? <span className="ml-0.5 text-red" aria-hidden="true">*</span> : null}
      </label>
      <input
        ref={ref}
        id={inputId}
        autoComplete={props.autoComplete ?? "off"}
        autoCapitalize={props.autoCapitalize ?? "off"}
        spellCheck={props.spellCheck ?? false}
        className={cn(
          "w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3.5 text-[14.5px] text-ink",
          "placeholder:text-gray-500 transition-colors",
          "focus:border-blue-500 focus:bg-white focus:outline-none",
          className,
        )}
        {...props}
      />
    </div>
  );
});
