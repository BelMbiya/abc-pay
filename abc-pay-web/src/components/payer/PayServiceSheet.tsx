"use client";

import { useEffect, useState } from "react";
import { Smartphone, Check, ArrowLeft, XCircle } from "lucide-react";
import { BottomSheet, Button, Field, AmountInput, ListRow, Receipt, Chip, ChipGroup } from "@/components/ui";
import { money, currencyCode, currencySymbol } from "@/lib/money";
import { mobileMethods } from "@/lib/payments-data";
import { channelId } from "@/lib/tuition-api";
import { recordTransaction } from "@/lib/transfers-api";

type Step = "form" | "method" | "success" | "failed";
const CUR = ["USD", "CDF"];

export interface PayTarget {
  label: string;
  sub: string;
}

/** Payer un service (électricité, eau, dîme…) — feuille coulissante (devise + succès/échec). */
export function PayServiceSheet({ target, onClose }: { target: PayTarget | null; onClose: () => void }) {
  const open = target !== null;
  const [step, setStep] = useState<Step>("form");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState<number>(10);
  const [currency, setCurrency] = useState(currencyCode());
  const [method, setMethod] = useState("");
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    if (open) {
      setStep("form");
      setReference("");
      setAmount(10);
      setCurrency(currencyCode());
      setMethod("");
      setReason(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const pick = async (m: string) => {
    setMethod(m);
    setBusy(true);
    const res = await recordTransaction({ type: "service", amount, currency, channel: channelId(m), label: target?.label, reference });
    setBusy(false);
    if (res.status === "echouee") {
      setReason(res.reason);
      setStep("failed");
    } else {
      setStep("success");
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={step === "success" ? "Paiement réussi" : step === "failed" ? "Paiement échoué" : target?.label ?? "Payer"}>
      {step === "form" ? (
        <div className="flex flex-col">
          <p className="mb-4 text-[12.5px] text-gray-500">{target?.sub}</p>
          <Field label="Référence" placeholder="N° de compteur, d'abonnement…" value={reference} onChange={(e) => setReference(e.target.value)} />
          <p className="mb-1 mt-3.5 text-[12.5px] font-bold text-gray-700">Montant</p>
          <AmountInput currency={currencySymbol(currency)} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Devise</p>
          <ChipGroup>
            {CUR.map((c) => <Chip key={c} selected={currency === c} onClick={() => setCurrency(c)}>{c === "USD" ? "USD ($)" : "CDF (FC)"}</Chip>)}
          </ChipGroup>
          <Button className="mt-6" disabled={!amount} onClick={() => setStep("method")}>Continuer</Button>
        </div>
      ) : null}

      {step === "method" ? (
        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={() => setStep("form")} className="mb-1 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-500 hover:text-ink">
            <ArrowLeft className="size-4" strokeWidth={2.2} /> Retour
          </button>
          {mobileMethods.map((m) => (
            <ListRow key={m.id} icon={Smartphone} title={m.title} subtitle={m.sub} onClick={() => !busy && pick(m.title)} />
          ))}
        </div>
      ) : null}

      {step === "success" ? (
        <div className="flex flex-col">
          <div className="py-1 text-center">
            <div className="mx-auto mb-2.5 flex size-14 items-center justify-center rounded-full bg-success-bg text-green"><Check className="size-7" strokeWidth={2.6} /></div>
          </div>
          <Receipt
            amount={money(amount, currency)}
            rows={[
              { label: "Service", value: target?.label ?? "-" },
              ...(reference ? [{ label: "Référence", value: reference }] : []),
              { label: "Moyen de paiement", value: method },
            ]}
          />
          <Button className="mt-5" onClick={onClose}>Terminer</Button>
        </div>
      ) : null}

      {step === "failed" ? (
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#FDE7E8] text-red"><XCircle className="size-7" strokeWidth={2.4} /></div>
          <h3 className="font-display text-[16px] font-bold text-ink">Paiement échoué</h3>
          <p className="max-w-[300px] text-[12.5px] leading-relaxed text-gray-500">{reason ?? "L'opération n'a pas pu aboutir. Réessaie."}</p>
          <div className="mt-2 flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>Modifier</Button>
            <Button className="flex-1" onClick={onClose}>Fermer</Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}
