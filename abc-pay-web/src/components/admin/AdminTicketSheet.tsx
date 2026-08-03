"use client";

import { useEffect, useState } from "react";
import { BottomSheet, Button, Chip, ChipGroup, StatusPill, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { respondTicket, CATEGORY_LABEL, TICKET_STATUS, PRIORITY_LABEL, type Ticket } from "@/lib/support-api";

const STATUS_TONE: Record<string, "live" | "gold" | "soon"> = { resolved: "live", in_progress: "gold", open: "soon" };
const STATUSES = [
  { id: "open", label: "Ouvert" },
  { id: "in_progress", label: "En cours" },
  { id: "resolved", label: "Résolu" },
];

/** Détail + traitement d'un ticket de support (super-admin). */
export function AdminTicketSheet({ ticket, onClose, onChanged }: { ticket: Ticket | null; onClose: () => void; onChanged: () => void }) {
  const { showToast } = useToast();
  const open = ticket !== null;
  const [status, setStatus] = useState("open");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    /* eslint-disable react-hooks/set-state-in-effect -- synchro depuis le ticket sélectionné */
    setStatus(ticket.status);
    setResponse(ticket.admin_response ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [ticket]);

  const save = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      await respondTicket(ticket.id, response.trim(), status);
      showToast("Ticket mis à jour");
      onChanged();
      onClose();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Action impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Ticket de support">
      {ticket ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-display text-[15px] font-bold text-ink">{ticket.subject}</div>
              <div className="text-[11.5px] text-gray-500">{ticket.reference} · {CATEGORY_LABEL[ticket.category] ?? ticket.category}</div>
            </div>
            <StatusPill tone={STATUS_TONE[ticket.status] ?? "soon"}>{TICKET_STATUS[ticket.status] ?? ticket.status}</StatusPill>
          </div>

          <div className="rounded-2xl bg-gray-100 px-4 py-3 text-[12.5px] text-gray-700">{ticket.message}</div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl bg-gray-100 px-3 py-2"><span className="text-gray-500">Auteur</span><div className="font-semibold text-ink">{ticket.user?.name || ticket.user?.phone || "—"}</div></div>
            <div className="rounded-xl bg-gray-100 px-3 py-2"><span className="text-gray-500">Priorité</span><div className="font-semibold text-ink">{PRIORITY_LABEL[ticket.priority] ?? ticket.priority}</div></div>
            {ticket.tx_reference ? <div className="col-span-2 rounded-xl bg-gray-100 px-3 py-2"><span className="text-gray-500">Transaction</span><div className="font-semibold text-ink">{ticket.tx_reference}</div></div> : null}
          </div>

          <p className="mb-1.5 mt-4 text-[12.5px] font-bold text-gray-700">Statut</p>
          <ChipGroup>
            {STATUSES.map((s) => <Chip key={s.id} selected={status === s.id} onClick={() => setStatus(s.id)}>{s.label}</Chip>)}
          </ChipGroup>

          <p className="mb-[7px] mt-3.5 text-[12.5px] font-bold text-gray-700">Réponse au client</p>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={4}
            placeholder="Message visible par l'utilisateur…"
            className="w-full resize-none rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3.5 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
          />

          <Button className="mt-4" disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </>
      ) : null}
    </BottomSheet>
  );
}
