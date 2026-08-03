"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Plus, ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";
import { BottomSheet, Button, Field, Chip, ChipGroup, StatusPill, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  fetchMyTickets, openTicket, TICKET_CATEGORIES, FREEZE_CATEGORIES, CATEGORY_LABEL, TICKET_STATUS,
  type Ticket, type OpenTicketInput,
} from "@/lib/support-api";

interface SupportApi {
  fetch: () => Promise<Ticket[]>;
  open: (input: OpenTicketInput) => Promise<Ticket>;
}

const STATUS_TONE: Record<string, "live" | "gold" | "soon"> = { resolved: "live", in_progress: "gold", open: "soon" };

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

/** Support côté payeur : liste des tickets + ouverture d'un nouveau ticket. */
const DEFAULT_API: SupportApi = { fetch: fetchMyTickets, open: openTicket };

export function SupportSheet({ open, onClose, api = DEFAULT_API }: { open: boolean; onClose: () => void; api?: SupportApi }) {
  const { showToast } = useToast();
  const [view, setView] = useState<"list" | "new">("list");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<OpenTicketInput>({ category: "dispute", subject: "", message: "", tx_reference: "" });

  const load = () => {
    setLoading(true);
    api.fetch().then(setTickets).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    setView("list");
    setError(null);
    setF({ category: "dispute", subject: "", message: "", tx_reference: "" });
    /* eslint-enable react-hooks/set-state-in-effect */
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recharger uniquement à l'ouverture
  }, [open]);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.open({ ...f, tx_reference: f.tx_reference?.trim() || undefined });
      showToast(FREEZE_CATEGORIES.includes(f.category) ? "Compte gelé — le support va te contacter" : "Ticket envoyé au support");
      setView("list");
      load();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setError(Object.values(e.fields).flat()[0] ?? e.message);
      else setError(e instanceof ApiError ? e.message : "Envoi impossible. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = f.subject.trim().length > 2 && f.message.trim().length > 4;
  const willFreeze = FREEZE_CATEGORIES.includes(f.category);

  return (
    <BottomSheet open={open} onClose={onClose} title={view === "new" ? "Nouveau ticket" : "Support & aide"}>
      {view === "list" ? (
        <>
          <Button icon={Plus} className="mb-4" onClick={() => setView("new")}>Ouvrir un ticket</Button>
          {loading ? (
            <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-gray-100" />)}</div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-500"><LifeBuoy className="size-5" strokeWidth={2} /></span>
              <p className="text-[13px] text-gray-500">Aucun ticket. Besoin d&apos;aide ? Ouvre-en un.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {tickets.map((t) => (
                <div key={t.id} className="rounded-2xl bg-gray-100 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-ink">{t.subject}</span>
                    <StatusPill tone={STATUS_TONE[t.status] ?? "soon"}>{TICKET_STATUS[t.status] ?? t.status}</StatusPill>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">{CATEGORY_LABEL[t.category] ?? t.category} · {t.reference} · {fdate(t.created_at)}</p>
                  {t.admin_response ? (
                    <div className="mt-2 flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-[12px] text-gray-700">
                      <CheckCircle2 className="size-4 shrink-0 text-green" strokeWidth={2.2} /> {t.admin_response}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col">
          <button type="button" onClick={() => setView("list")} className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-500 hover:text-ink">
            <ArrowLeft className="size-4" strokeWidth={2.2} /> Mes tickets
          </button>

          <p className="mb-1.5 text-[12.5px] font-bold text-gray-700">Motif</p>
          <ChipGroup>
            {TICKET_CATEGORIES.map((c) => <Chip key={c.id} selected={f.category === c.id} onClick={() => setF((p) => ({ ...p, category: c.id }))}>{c.label}</Chip>)}
          </ChipGroup>

          {willFreeze ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDE7E8] px-3.5 py-2.5 text-[12px] font-semibold text-red">
              <ShieldAlert className="size-4 shrink-0" strokeWidth={2.2} /> Ce signalement <b>gèle immédiatement ton compte</b> (blocage + déconnexion) par sécurité. Le support te recontactera pour le débloquer.
            </div>
          ) : null}

          <Field label="Sujet" required placeholder="Résume ton problème" value={f.subject} onChange={(e) => setF((p) => ({ ...p, subject: e.target.value }))} />
          {f.category === "dispute" ? (
            <Field label="N° de reçu / transaction (facultatif)" placeholder="RC-2026-00001" value={f.tx_reference ?? ""} onChange={(e) => setF((p) => ({ ...p, tx_reference: e.target.value }))} />
          ) : null}
          <p className="mb-[7px] mt-3.5 text-[12.5px] font-bold text-gray-700">Message <span className="text-red">*</span></p>
          <textarea
            value={f.message}
            onChange={(e) => setF((p) => ({ ...p, message: e.target.value }))}
            rows={4}
            placeholder="Décris ton problème en détail…"
            className="w-full resize-none rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3.5 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
          />

          {error ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}
          <Button className="mt-4" disabled={!canSubmit || saving} onClick={submit}>{saving ? "Envoi…" : willFreeze ? "Signaler et bloquer mon compte" : "Envoyer au support"}</Button>
        </div>
      )}
    </BottomSheet>
  );
}
