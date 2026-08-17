"use client";

import { useEffect, useState } from "react";
import { Ban, CheckCircle2, LogOut, Trash2, ShieldAlert, ListChecks, KeyRound } from "lucide-react";
import { BottomSheet, Button, StatusPill, useToast, useConfirm } from "@/components/ui";
import { money } from "@/lib/money";
import { ApiError } from "@/lib/api";
import { RULE_LABELS, SEVERITY } from "@/lib/fraud-api";
import { genderLabel, idDocLabel } from "@/lib/profile-api";
import { fetchUser, fetchUserTransactions, blockUser, unblockUser, disconnectUser, deleteUser, ROLE_LABEL, type AdminUserDetail } from "@/lib/admin-users-api";
import { type TxRow } from "@/lib/tx-views-api";

const TX_TYPE_LABEL: Record<string, string> = { tuition: "Tuition", send: "Envoi", service: "Service", receive: "Reçu" };
const fdt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2.5 last:border-b-0">
      <span className="text-[12px] text-gray-500">{label}</span>
      <span className="text-right text-[12.5px] font-semibold text-ink">{value}</span>
    </div>
  );
}

/** Détail d'un compte utilisateur + actions de gestion (super-admin). */
export function AdminUserSheet({ userId, onClose, onChanged }: { userId: number | null; onClose: () => void; onChanged: () => void }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const open = userId !== null;
  const [u, setU] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [allTx, setAllTx] = useState<TxRow[] | null>(null);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    if (!open || userId === null) return;
    let active = true;
    /* eslint-disable react-hooks/set-state-in-effect -- chargement à l'ouverture de la feuille */
    setLoading(true);
    setAllTx(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchUser(userId)
      .then((d) => active && setU(d))
      .catch(() => active && showToast("Chargement impossible"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, userId, showToast]);

  const run = async (fn: () => Promise<AdminUserDetail>, msg: string) => {
    setBusy(true);
    try {
      setU(await fn());
      showToast(msg);
      onChanged();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (userId === null || !u) return;
    const ok = await confirm({
      title: "Supprimer ce compte ?",
      message: `Le compte ${u.name || u.phone} sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteUser(userId);
      showToast("Compte supprimé");
      onChanged();
      onClose();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  };

  /** Enveloppe une action de gestion d'une confirmation modale préalable. */
  const confirmRun = async (
    opts: { title: string; message?: string; confirmLabel?: string; danger?: boolean },
    fn: () => Promise<AdminUserDetail>,
    msg: string,
  ) => {
    if (await confirm(opts)) await run(fn, msg);
  };

  const loadAllTx = async () => {
    if (!u) return;
    setLoadingTx(true);
    try {
      setAllTx(await fetchUserTransactions(u.id));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Chargement impossible");
    } finally {
      setLoadingTx(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Compte utilisateur">
      {loading || !u ? (
        <div className="flex flex-col gap-3 py-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-[13px] bg-gray-100" />)}</div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-blue-500),var(--color-navy))] font-display text-[15px] font-bold text-white">
              {(u.name ?? u.phone).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[15px] font-bold text-ink">{u.name || "—"}</div>
              <div className="text-[12px] text-gray-500">{u.phone}</div>
            </div>
            <StatusPill tone={u.is_blocked ? "soon" : "live"}>{u.is_blocked ? "Bloqué" : "Actif"}</StatusPill>
          </div>

          {u.is_blocked && u.blocked_reason ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-[#FDE7E8] px-3.5 py-2.5 text-[12px] font-semibold text-red">
              <ShieldAlert className="size-4 shrink-0" strokeWidth={2.2} /> {u.blocked_reason}
            </div>
          ) : null}

          <div className="rounded-2xl bg-gray-100 px-4 py-1">
            <Row label="Rôle" value={ROLE_LABEL[u.role] ?? u.role} />
            <Row label="KYC" value={u.kyc_complete ? "Vérifié" : "Incomplet"} />
            <Row label="E-mail" value={u.email || "—"} />
            <Row label="Date de naissance" value={u.birth_date || "—"} />
            <Row label="Genre" value={genderLabel(u.gender)} />
            <Row label="Adresse" value={[u.address, u.city].filter(Boolean).join(", ") || "—"} />
            <Row label="Pièce" value={u.id_doc_type ? `${idDocLabel(u.id_doc_type)} · ${u.id_doc_number}` : "—"} />
            <Row label="Transactions" value={String(u.transactions_count)} />
          </div>

          {u.fraud_flags.length > 0 ? (
            <>
              <p className="mb-1.5 mt-4 text-[12.5px] font-bold text-gray-700">Signalements de fraude</p>
              <div className="flex flex-col gap-1.5">
                {u.fraud_flags.slice(0, 5).map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-100 px-3 py-2">
                    <span className="text-[12px] text-gray-700">{RULE_LABELS[f.rule] ?? f.rule}</span>
                    <StatusPill tone={SEVERITY[f.severity]?.tone ?? "gold"}>{SEVERITY[f.severity]?.label ?? f.severity}</StatusPill>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {/* Suivi / trace des transactions */}
          {u.transactions_count > 0 || allTx ? (
            <>
              <div className="mb-1.5 mt-4 flex items-center justify-between">
                <p className="text-[12.5px] font-bold text-gray-700">{allTx ? "Trace complète" : "Dernières transactions"}</p>
                {allTx ? <span className="text-[11px] text-gray-500">{allTx.length} opération{allTx.length > 1 ? "s" : ""}</span> : null}
              </div>

              {!allTx ? (
                <>
                  <div className="flex flex-col">
                    {u.transactions.slice(0, 6).map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 border-b border-gray-100 py-2 last:border-b-0">
                        <span className="text-[12px] text-gray-500">{fdt(t.created_at)} · {TX_TYPE_LABEL[t.type] ?? t.type} · {t.channel}</span>
                        <span className="text-[12.5px] font-bold text-ink">{money(t.amount, t.currency)}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" icon={ListChecks} disabled={loadingTx} onClick={loadAllTx} className="mt-2.5">
                    {loadingTx ? "Chargement…" : `Voir toute la trace (${u.transactions_count})`}
                  </Button>
                </>
              ) : allTx.length === 0 ? (
                <p className="py-3 text-[12px] text-gray-500">Aucune transaction.</p>
              ) : (
                <div className="max-h-[340px] overflow-y-auto rounded-2xl bg-gray-100 p-2.5">
                  {allTx.map((t) => (
                    <div key={t.id} className="border-b border-white py-2 last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-bold text-ink">{TX_TYPE_LABEL[t.type] ?? t.type}</span>
                        <span className="text-[12.5px] font-bold text-ink">{money(t.amount, t.currency)}</span>
                      </div>
                      <div className="mt-0.5 flex items-start justify-between gap-2">
                        <span className="text-[11px] leading-relaxed text-gray-500">
                          {fdt(t.created_at)} · {t.channel}
                          {t.establishment ? ` · ${t.establishment}` : ""}
                          {t.counterparty_name ? ` · ${t.counterparty_name}` : ""}
                          {t.actor && t.actor_registered === false ? " · tiers non connecté" : ""}
                        </span>
                        <StatusPill tone={t.status === "success" ? "live" : t.status === "failed" ? "soon" : "gold"}>{t.status}</StatusPill>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {/* Accès du compte — clarification sécurité (payeur = OTP, pas de mot de passe) */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-blue-100 px-3.5 py-3 text-[11.5px] leading-relaxed text-blue-700">
            <KeyRound className="mt-px size-4 shrink-0" strokeWidth={2.2} />
            <span>
              Ce compte se connecte par <b>OTP (code SMS)</b> — il n&apos;a <b>pas de mot de passe</b> à réinitialiser.
              Pour couper l&apos;accès : <b>Déconnecter</b> (force une nouvelle vérification) ou <b>Bloquer</b> le compte.
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-2">
            {u.is_blocked ? (
              <Button variant="outline" icon={CheckCircle2} disabled={busy} onClick={() => confirmRun(
                { title: "Débloquer ce compte ?", message: `${u.name || u.phone} pourra de nouveau se connecter et opérer.`, confirmLabel: "Débloquer" },
                () => unblockUser(u.id), "Compte débloqué",
              )}>Débloquer le compte</Button>
            ) : (
              <Button variant="outline" icon={Ban} disabled={busy} onClick={() => confirmRun(
                { title: "Bloquer ce compte ?", message: `${u.name || u.phone} ne pourra plus se connecter ni opérer jusqu'au déblocage.`, confirmLabel: "Bloquer", danger: true },
                () => blockUser(u.id), "Compte bloqué",
              )}>Bloquer le compte</Button>
            )}
            <Button variant="outline" icon={LogOut} disabled={busy} onClick={() => confirmRun(
              { title: "Déconnecter ce compte ?", message: "Toutes les sessions actives seront révoquées ; une nouvelle vérification sera exigée.", confirmLabel: "Déconnecter", danger: true },
              () => disconnectUser(u.id), "Sessions révoquées",
            )}>Déconnecter (révoquer les sessions)</Button>
            <button type="button" disabled={busy} onClick={remove} className="flex items-center justify-center gap-2 rounded-pill border-[1.5px] border-gray-300 py-3.5 text-[13.5px] font-bold text-red hover:bg-gray-100 disabled:opacity-50">
              <Trash2 className="size-4" strokeWidth={2.2} /> Supprimer le compte
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
