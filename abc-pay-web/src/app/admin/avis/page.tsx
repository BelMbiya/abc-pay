"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useToast, useConfirm } from "@/components/ui";
import { fetchAdminReviews, moderateReview, type AdminReview } from "@/lib/reviews-api";

const STATUS_LABEL: Record<string, string> = { pending: "En attente", approved: "Publié", rejected: "Rejeté" };

export default function AdminAvisPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<AdminReview[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    setState("loading");
    fetchAdminReviews()
      .then((r) => {
        setRows(r);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminReviews()
      .then((r) => active && (setRows(r), setState("ready")))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const act = async (id: string, action: "approve" | "reject") => {
    const ok = action === "approve"
      ? await confirm({ title: "Publier cet avis ?", message: "Il sera visible publiquement dans la section « témoignages » de la landing.", confirmLabel: "Publier" })
      : await confirm({ title: "Rejeter cet avis ?", message: "Il ne sera pas publié sur la landing.", confirmLabel: "Rejeter", danger: true });
    if (!ok) return;
    try {
      await moderateReview(id, action);
      showToast(action === "approve" ? "Avis publié sur la landing" : "Avis rejeté");
      load();
    } catch {
      showToast("Action impossible");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Avis</h1>
      <p className="mb-5 text-[13px] text-gray-500">Modère les témoignages avant leur publication en section « témoignages » de la landing.</p>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">
          Chargement impossible. <button onClick={load} className="font-bold text-blue-600">Réessayer</button>
        </div>
      ) : state === "loading" ? (
        <div className="py-16 text-center text-[13px] text-gray-500">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Aucun avis pour l&apos;instant.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl bg-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] tracking-wide text-gold-500">{"★".repeat(Math.max(1, Math.min(5, r.rating)))}</span>
                    <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-gray-500">{STATUS_LABEL[r.status] ?? r.status}</span>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink">« {r.message} »</p>
                  <p className="mt-1 text-[11.5px] text-gray-500">{[r.author_name, r.author_role, r.context].filter(Boolean).join(" · ")} · {r.author_type}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status !== "approved" ? (
                    <button onClick={() => act(r.id, "approve")} aria-label="Publier" className="flex size-9 items-center justify-center rounded-lg bg-green text-white hover:opacity-90"><Check className="size-4" strokeWidth={2.4} /></button>
                  ) : null}
                  {r.status !== "rejected" ? (
                    <button onClick={() => act(r.id, "reject")} aria-label="Rejeter" className="flex size-9 items-center justify-center rounded-lg bg-red text-white hover:opacity-90"><X className="size-4" strokeWidth={2.4} /></button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
