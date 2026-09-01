import { Loader2 } from "lucide-react";

/** État de chargement global (navigation / Suspense) — spinner discret dans la charte. */
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center px-6 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
      <img src="/logo.png" alt="abc pay" width={36} height={36} className="mb-5 size-9 rounded-[10px] object-contain" />
      <Loader2 className="size-7 animate-spin text-blue-600" strokeWidth={2.2} />
      <p className="mt-3 text-[12.5px] font-semibold text-gray-500">Chargement…</p>
    </main>
  );
}
