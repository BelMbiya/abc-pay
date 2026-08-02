"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { BottomSheet, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { userReceiveUrl, generateQrDataUrl } from "@/lib/qr";

/** Recevoir un paiement — QR personnel abc pay (ou lien), dans une feuille coulissante. */
export function ReceiveSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState<"qr" | "link">("qr");
  const [qr, setQr] = useState<string | null>(null);

  const phone = user?.phone ?? "";
  const name = user?.name ?? undefined;
  const link = phone ? userReceiveUrl(phone, name) : "";

  useEffect(() => {
    let active = true;
    if (open && link) {
      generateQrDataUrl(link, 460).then((d) => active && setQr(d)).catch(() => active && setQr(null));
    }
    return () => {
      active = false;
    };
  }, [open, link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Lien copié");
    } catch {
      showToast("Copie impossible");
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Recevoir un paiement">
      <div className="mb-5 flex gap-2 rounded-pill bg-gray-100 p-1">
        {(["qr", "link"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-pill py-2.5 text-[13px] font-bold transition-colors",
              tab === t ? "bg-white text-ink shadow-card" : "text-gray-500",
            )}
          >
            {t === "qr" ? "Code QR" : "Lien"}
          </button>
        ))}
      </div>

      {tab === "qr" ? (
        <div className="flex flex-col items-center pb-2">
          <div className="flex size-56 items-center justify-center overflow-hidden rounded-3xl bg-white p-3 shadow-card">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- data-URL local (QR généré)
              <img src={qr} alt="Mon QR abc pay" className="size-full object-contain" />
            ) : (
              <div className="size-full animate-pulse rounded-2xl bg-gray-100" />
            )}
          </div>
          <p className="mt-4 text-center text-[13px] text-gray-500">Fais scanner ce code pour être payé instantanément.</p>
          {name ? <p className="mt-1 font-display text-[15px] font-bold text-ink">{name}</p> : null}
          <p className="text-[12px] text-gray-500">{phone || "Connecte-toi pour générer ton QR"}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-3.5 text-[12.5px] text-gray-700">
          <span className="min-w-0 flex-1 break-all">{link || "—"}</span>
          <button
            type="button"
            onClick={copy}
            disabled={!link}
            className="flex shrink-0 items-center gap-1.5 rounded-pill bg-ink px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
          >
            <Copy className="size-3.5" strokeWidth={2.2} /> Copier
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
