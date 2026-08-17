"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone, MessageCircle, Mail, Trash2 } from "lucide-react";
import { useToast, useConfirm } from "@/components/ui";
import { fetchAdminLeads, updateLeadStatus, deleteLead, LEAD_STATUSES, type AdminLead, type LeadStatus, type LeadChannel } from "@/lib/leads-api";

/** Libellé + couleur de pastille par étape du pipeline. */
const STATUS_META: Record<LeadStatus, { label: string; pill: string }> = {
  nouveau: { label: "Nouveau", pill: "bg-blue-100 text-blue-700" },
  contacte: { label: "Contacté", pill: "bg-fee-bg text-gold-600" },
  qualifie: { label: "Qualifié", pill: "bg-success-bg text-green" },
  clos: { label: "Clos", pill: "bg-white text-gray-500" },
};

/** Canal de contact souhaité : libellé pour la pastille « préférence ». */
const CHANNEL_LABEL: Record<LeadChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  appel: "Appel",
};
/** Surbrillance du bouton d'action correspondant au canal préféré. */
const preferred = (channel: LeadChannel, target: LeadChannel) =>
  channel === target ? "ring-2 ring-blue-500 ring-offset-1" : "";

const PROFILE_LABEL: Record<string, string> = {
  ecole: "École",
  superieur: "Établissement supérieur",
  reseau: "Réseau d'établissements",
  operateur: "Opérateur",
  investisseur: "Investisseur",
  autre: "Autre",
};

type Filter = "all" | LeadStatus;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Numéro nettoyé pour les liens tel: / wa.me (chiffres + éventuel +). */
function telHref(phone: string): string {
  return "tel:" + phone.replace(/[^\d+]/g, "");
}
function waHref(phone: string): string {
  return "https://wa.me/" + phone.replace(/[^\d]/g, "");
}

export default function AdminDemandesPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<AdminLead[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState("loading");
    fetchAdminLeads()
      .then((r) => { setRows(r); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminLeads()
      .then((r) => active && (setRows(r), setState("ready")))
      .catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const s of LEAD_STATUSES) c[s] = 0;
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const changeStatus = async (lead: AdminLead, status: LeadStatus) => {
    if (status === lead.status) return;
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === lead.id ? { ...r, status } : r))); // optimiste
    try {
      await updateLeadStatus(lead.id, status);
      showToast(`Marquée « ${STATUS_META[status].label} »`);
    } catch {
      setRows(prev);
      showToast("Mise à jour impossible");
    }
  };

  const remove = async (lead: AdminLead) => {
    const ok = await confirm({
      title: "Supprimer cette demande ?",
      message: `La demande de « ${lead.establishment_name} » sera définitivement supprimée.`,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteLead(lead.id);
      setRows((rs) => rs.filter((r) => r.id !== lead.id));
      showToast("Demande supprimée");
    } catch {
      showToast("Suppression impossible");
    } finally { setBusy(false); }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Toutes" },
    ...LEAD_STATUSES.map((s) => ({ key: s as Filter, label: STATUS_META[s].label })),
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Demandes de démo</h1>
      <p className="mb-5 text-[13px] text-gray-500">
        Demandes de démo et de partenariat émises depuis la section « Parlons de votre établissement » de la landing. Suis chaque piste : <b>Nouveau → Contacté → Qualifié → Clos</b>.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-pill px-3 py-1.5 text-[12.5px] font-bold transition-colors ${
              filter === f.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-300/40"
            }`}
          >
            {f.label} <span className={filter === f.key ? "opacity-80" : "text-gray-500"}>· {counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">
          Chargement impossible. <button onClick={load} className="font-bold text-blue-600">Réessayer</button>
        </div>
      ) : state === "loading" ? (
        <div className="py-16 text-center text-[13px] text-gray-500">Chargement…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">
          {filter === "all" ? "Aucune demande pour l'instant." : "Aucune demande à cette étape."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((lead) => (
            <div key={lead.id} className="rounded-2xl bg-gray-100 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_META[lead.status].pill}`}>
                      {STATUS_META[lead.status].label}
                    </span>
                    {lead.profile ? (
                      <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-blue-600">
                        {PROFILE_LABEL[lead.profile] ?? lead.profile}
                      </span>
                    ) : null}
                    <span className="rounded-pill bg-blue-600/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-blue-700">
                      Contact : {CHANNEL_LABEL[lead.contact_channel] ?? lead.contact_channel}
                    </span>
                    {lead.created_at ? <span className="text-[10.5px] text-gray-500">{formatDate(lead.created_at)}</span> : null}
                  </div>
                  <p className="mt-2 text-[15px] font-bold text-ink">{lead.establishment_name}</p>
                  <p className="mt-0.5 text-[12.5px] text-gray-500">
                    {lead.contact_name} · <a href={telHref(lead.phone)} className="font-semibold text-blue-600 hover:underline">{lead.phone}</a>
                    {lead.email ? <> · <a href={`mailto:${lead.email}`} className="font-semibold text-blue-600 hover:underline">{lead.email}</a></> : null}
                  </p>
                  {lead.message ? <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink">{lead.message}</p> : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <a href={telHref(lead.phone)} aria-label={`Appeler${lead.contact_channel === "appel" ? " (canal préféré)" : ""}`} className={`flex size-9 items-center justify-center rounded-lg bg-white text-blue-600 hover:bg-gray-300/40 ${preferred(lead.contact_channel, "appel")}`}>
                    <Phone className="size-4" strokeWidth={2.2} />
                  </a>
                  <a href={waHref(lead.phone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp${lead.contact_channel === "whatsapp" ? " (canal préféré)" : ""}`} className={`flex size-9 items-center justify-center rounded-lg bg-white text-green hover:bg-gray-300/40 ${preferred(lead.contact_channel, "whatsapp")}`}>
                    <MessageCircle className="size-4" strokeWidth={2.2} />
                  </a>
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} aria-label={`Envoyer un email${lead.contact_channel === "email" ? " (canal préféré)" : ""}`} className={`flex size-9 items-center justify-center rounded-lg bg-white text-blue-600 hover:bg-gray-300/40 ${preferred(lead.contact_channel, "email")}`}>
                      <Mail className="size-4" strokeWidth={2.2} />
                    </a>
                  ) : null}
                  <button onClick={() => remove(lead)} disabled={busy} aria-label="Supprimer" className="flex size-9 items-center justify-center rounded-lg bg-white text-red hover:bg-gray-300/40 disabled:opacity-50">
                    <Trash2 className="size-4" strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 border-t border-gray-300/40 pt-3">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Étape</span>
                {LEAD_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(lead, s)}
                    aria-pressed={lead.status === s}
                    className={`rounded-pill px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                      lead.status === s ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-300/40"
                    }`}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
