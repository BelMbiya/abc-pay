"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Settings2, RefreshCw, Ban, CheckCircle2, Banknote } from "lucide-react";
import { Button, StatusPill, useToast, useConfirm, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { OnboardEstablishmentSheet } from "@/components/admin/OnboardEstablishmentSheet";
import { ConfigureEstablishmentSheet } from "@/components/admin/ConfigureEstablishmentSheet";
import { fetchAdminEstablishments, updateEstablishment, fetchEstablishmentSettlements, executeSettlement, type AdminEstablishment } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

export default function AdminEstablishmentsPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [configTarget, setConfigTarget] = useState<AdminEstablishment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<AdminEstablishment[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setItems(await fetchAdminEstablishments());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminEstablishments()
      .then((d) => active && (setItems(d), setState("ready")))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const toggleStatus = async (e: AdminEstablishment) => {
    const suspending = e.is_active;
    const ok = await confirm({
      title: suspending ? `Suspendre ${e.name} ?` : `Réactiver ${e.name} ?`,
      message: suspending
        ? "L'établissement ne pourra plus recevoir de paiements tant qu'il est suspendu."
        : "L'établissement pourra de nouveau recevoir des paiements.",
      confirmLabel: suspending ? "Suspendre" : "Réactiver",
      danger: suspending,
    });
    if (!ok) return;

    setBusyId(e.id);
    try {
      await updateEstablishment(e.id, { is_active: !e.is_active });
      showToast(suspending ? `${e.name} suspendu` : `${e.name} réactivé`);
      await load();
    } catch {
      showToast("Action impossible");
    } finally {
      setBusyId(null);
    }
  };

  const reverse = async (e: AdminEstablishment) => {
    setBusyId(e.id);
    try {
      const { pending, establishment } = await fetchEstablishmentSettlements(e.id);
      const sym = establishment.currency === "CDF" ? "FC" : "$";
      if (!pending || pending.net <= 0) {
        showToast(`Rien à reverser pour ${e.name}`);
        return;
      }
      const ok = await confirm({
        title: `Reverser ${e.name} ?`,
        message: `Un reversement de ${pending.net.toLocaleString("fr-FR")} ${sym} (${pending.count} encaissement${pending.count > 1 ? "s" : ""}) va être exécuté et marqué comme payé.`,
        confirmLabel: "Reverser",
      });
      if (!ok) return;
      const res = await executeSettlement(e.id);
      const suffix = res.status === "pending" ? " (transfert en cours)" : "";
      showToast(`Reversement de ${res.net.toLocaleString("fr-FR")} ${sym} effectué${suffix}`);
      await load();
    } catch (err) {
      // Remonter la VRAIE raison (numéro manquant, transfert refusé…) au lieu d'un générique.
      const msg =
        err instanceof ApiError
          ? (err.fields ? Object.values(err.fields).flat()[0] ?? err.message : err.message)
          : "Reversement impossible. Vérifie ta connexion et réessaie.";
      showToast(msg);
    } finally {
      setBusyId(null);
    }
  };

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(
      (e) => !s || e.name.toLowerCase().includes(s) || (e.city ?? "").toLowerCase().includes(s) || e.type.toLowerCase().includes(s),
    );
  }, [q, items]);

  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(rows);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Établissements"
        subtitle={`${items.length} établissement${items.length > 1 ? "s" : ""} partenaire${items.length > 1 ? "s" : ""}`}
        actions={<Button fullWidth={false} icon={Plus} onClick={() => setOnboardOpen(true)}>Onboarder</Button>}
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-gray-500" strokeWidth={2} />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un établissement, une ville…"
            autoComplete="off"
            className="w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 py-3 pl-11 pr-4 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={load}
          aria-label="Actualiser"
          className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
        </button>
      </div>

      {state === "error" ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 py-16 text-center">
          <p className="text-[13px] text-gray-500">Impossible de charger les établissements.</p>
          <button type="button" onClick={load} className="rounded-pill bg-white px-4 py-2 text-[12.5px] font-bold text-ink">Réessayer</button>
        </div>
      ) : null}

      {state === "ready" && rows.length === 0 ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">
          Aucun établissement. Clique sur « Onboarder » pour en créer un.
        </div>
      ) : null}

      {(state === "loading" || (state === "ready" && rows.length > 0)) ? (
        <>
        <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-3">Établissement</th>
                <th className="pb-3 pr-3">Ville</th>
                <th className="pb-3 pr-3">Compte de connexion</th>
                <th className="pb-3 pr-3">Statut</th>
                <th className="pb-3 pr-3 text-right">Commission</th>
                <th className="pb-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {state === "loading"
                ? [0, 1, 2].map((i) => (
                    <tr key={i} className="border-t border-white">
                      <td colSpan={6} className="py-3"><div className="h-4 w-full animate-pulse rounded bg-white" /></td>
                    </tr>
                  ))
                : pageItems.map((e) => (
                    <tr key={e.id} className="border-t border-white text-[13px]">
                      <td className="py-3 pr-3">
                        <div className="font-bold text-ink">{e.name}</div>
                        <div className="text-[11.5px] text-gray-500">{e.type} · {e.merchant_code}</div>
                      </td>
                      <td className="py-3 pr-3 text-gray-500">{e.city ?? "—"}</td>
                      <td className="py-3 pr-3">
                        <span className="font-semibold text-ink">{e.login_email ?? "—"}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <StatusPill tone={e.status === "active" ? "live" : e.status === "pending" ? "soon" : "soon"}>{e.status === "pending" ? "Vérification en cours" : e.is_active ? "Actif" : "Suspendu"}</StatusPill>
                      </td>
                      <td className="py-3 pr-3 text-right font-bold text-ink">{(e.commission_rate * 100).toFixed(1)} %</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            aria-label="Configurer"
                            onClick={() => setConfigTarget(e)}
                            className="flex size-8 items-center justify-center rounded-lg bg-white text-gray-700 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <Settings2 className="size-4" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            aria-label="Reverser"
                            title="Reverser les encaissements en attente"
                            disabled={busyId === e.id}
                            onClick={() => reverse(e)}
                            className="flex size-8 items-center justify-center rounded-lg bg-white text-blue-600 hover:opacity-80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <Banknote className="size-4" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            aria-label={e.is_active ? "Suspendre" : "Réactiver"}
                            title={e.is_active ? "Suspendre" : "Réactiver"}
                            disabled={busyId === e.id}
                            onClick={() => toggleStatus(e)}
                            className={`flex size-8 items-center justify-center rounded-lg bg-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${e.is_active ? "text-red hover:opacity-80" : "text-green hover:opacity-80"}`}
                          >
                            {e.is_active ? <Ban className="size-4" strokeWidth={2} /> : <CheckCircle2 className="size-4" strokeWidth={2} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        </>
      ) : null}

      <OnboardEstablishmentSheet open={onboardOpen} onClose={() => setOnboardOpen(false)} onCreated={load} />
      <ConfigureEstablishmentSheet establishment={configTarget} onClose={() => setConfigTarget(null)} onSaved={load} />
    </div>
  );
}
