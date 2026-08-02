"use client";

import { useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { establishmentTuitionUrl, generateQrDataUrl } from "@/lib/qr";

/**
 * QR de paiement d'un établissement : une fois scanné, il ouvre le parcours
 * Tuition avec l'établissement DÉJÀ présélectionné. `refCode` = code marchand ou id.
 */
export function EstablishmentQrCard({
  refCode,
  name,
  compact = false,
}: {
  refCode: string;
  name: string;
  compact?: boolean;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const url = establishmentTuitionUrl(refCode);

  useEffect(() => {
    let active = true;
    generateQrDataUrl(url, 640).then((d) => active && setQr(d)).catch(() => active && setQr(null));
    return () => {
      active = false;
    };
  }, [url]);

  const download = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `qr-abc-pay-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
    a.click();
  };

  return (
    <div className={`rounded-2xl bg-gray-100 p-4 ${compact ? "" : "sm:p-5"}`}>
      <div className="flex items-start gap-4">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-card sm:size-32">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- data-URL local (QR généré)
            <img src={qr} alt={`QR de paiement ${name}`} className="size-full object-contain" />
          ) : (
            <QrCode className="size-16 text-gray-300" strokeWidth={1.2} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">QR de paiement</p>
          <h3 className="mt-0.5 text-[14px] font-bold text-ink">{name}</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-gray-500">
            Affichez ou imprimez ce code : en le scannant, les payeurs arrivent directement sur le paiement Tuition, établissement déjà rempli.
          </p>
          <button
            type="button"
            onClick={download}
            disabled={!qr}
            className="mt-3 inline-flex items-center gap-2 rounded-pill bg-ink px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
          >
            <Download className="size-3.5" strokeWidth={2.2} /> Télécharger le QR
          </button>
        </div>
      </div>
    </div>
  );
}
