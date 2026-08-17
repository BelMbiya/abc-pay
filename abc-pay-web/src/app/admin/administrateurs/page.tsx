"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCog, Plus, Trash2 } from "lucide-react";
import { BottomSheet, Button, StatusPill, useToast, useConfirm } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { getAdminUser } from "@/lib/admin-auth";
import { fetchAdmins, createAdmin, updateAdmin, deleteAdmin, type AdminAccount, type AdminRoleDef } from "@/lib/admin-team-api";

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default function AdminTeamPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [roles, setRoles] = useState<AdminRoleDef[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [createOpen, setCreateOpen] = useState(false);
  const meId = getAdminUser()?.id;

  const load = useCallback(() => {
    setState("loading");
    fetchAdmins().then((r) => { setAdmins(r.admins); setRoles(r.roles); setState("ready"); }).catch(() => setState("error"));
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdmins().then((r) => active && (setAdmins(r.admins), setRoles(r.roles), setState("ready"))).catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  const err = (e: unknown) => {
    const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
    showToast(field ?? (e instanceof ApiError ? e.message : "Action impossible"));
  };

  const changeRole = async (a: AdminAccount, role: string) => {
    if (role === a.role) return;
    try { await updateAdmin(a.id, { role }); showToast("Rôle mis à jour"); load(); } catch (e) { err(e); }
  };

  const toggleActive = async (a: AdminAccount) => {
    const ok = await confirm({ title: a.is_active ? "Désactiver ce compte ?" : "Réactiver ce compte ?", message: `${a.name} (${a.email})`, confirmLabel: a.is_active ? "Désactiver" : "Réactiver", danger: a.is_active });
    if (!ok) return;
    try { await updateAdmin(a.id, { is_active: !a.is_active }); showToast("Compte mis à jour"); load(); } catch (e) { err(e); }
  };

  const remove = async (a: AdminAccount) => {
    const ok = await confirm({ title: "Supprimer cet administrateur ?", message: `${a.name} (${a.email}) — action irréversible.`, confirmLabel: "Supprimer", danger: true });
    if (!ok) return;
    try { await deleteAdmin(a.id); showToast("Administrateur supprimé"); load(); } catch (e) { err(e); }
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-6 md:px-8 md:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCog className="size-[22px] text-blue-600" strokeWidth={2.2} />
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Administrateurs</h1>
        </div>
        <Button fullWidth={false} icon={Plus} onClick={() => setCreateOpen(true)}>Nouvel admin</Button>
      </div>
      <p className="mb-5 text-[13px] text-gray-500">Comptes système qui gèrent la plateforme. Chaque rôle donne un jeu de permissions (moindre privilège). Un compte créé ici doit changer son mot de passe à sa 1ʳᵉ connexion.</p>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Chargement impossible. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "loading" ? (
        <div className="py-16 text-center text-[13px] text-gray-500">Chargement…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-3">Administrateur</th>
                <th className="pb-3 pr-3">Rôle</th>
                <th className="pb-3 pr-3">Statut</th>
                <th className="pb-3 pr-3">Créé</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const isMe = a.id === meId;
                return (
                  <tr key={a.id} className="border-t border-white text-[13px]">
                    <td className="py-3 pr-3">
                      <div className="font-bold text-ink">{a.name} {isMe ? <span className="text-[10.5px] font-semibold text-gray-500">(vous)</span> : null}</div>
                      <div className="text-[11.5px] text-gray-500">{a.email}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <select value={a.role} disabled={isMe} onChange={(e) => changeRole(a, e.target.value)} className="rounded-lg border-[1.5px] border-gray-100 bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-ink focus:border-blue-500 focus:outline-none disabled:opacity-60">
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-3">
                      <StatusPill tone={a.is_active ? "live" : "soon"}>{a.is_active ? "Actif" : "Désactivé"}</StatusPill>
                      {a.must_change_password ? <span className="ml-1.5 rounded-pill bg-fee-bg px-2 py-0.5 text-[9px] font-extrabold uppercase text-gold-600">MDP à changer</span> : null}
                    </td>
                    <td className="py-3 pr-3 text-gray-500">{fdate(a.created_at)}</td>
                    <td className="py-3 text-right">
                      {!isMe ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={() => toggleActive(a)} className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold ${a.is_active ? "bg-white text-gray-700 hover:bg-gray-300/40" : "bg-green text-white hover:opacity-90"}`}>{a.is_active ? "Désactiver" : "Réactiver"}</button>
                          <button type="button" aria-label="Supprimer" onClick={() => remove(a)} className="flex size-8 items-center justify-center rounded-lg bg-white text-red hover:opacity-80"><Trash2 className="size-4" strokeWidth={2.2} /></button>
                        </div>
                      ) : <span className="text-[11px] text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateAdminSheet open={createOpen} onClose={() => setCreateOpen(false)} roles={roles} onCreated={() => { setCreateOpen(false); load(); }} onError={err} onOk={showToast} />
    </div>
  );
}

function CreateAdminSheet({ open, onClose, roles, onCreated, onError, onOk }: {
  open: boolean; onClose: () => void; roles: AdminRoleDef[];
  onCreated: () => void; onError: (e: unknown) => void; onOk: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("support");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) { onError(new Error("Nom, e-mail et mot de passe (8+ car.) requis")); return; }
    setBusy(true);
    try {
      await createAdmin({ name: name.trim(), email: email.trim(), role, password });
      onOk("Administrateur créé — il devra changer son mot de passe");
      setName(""); setEmail(""); setPassword(""); setRole("support");
      onCreated();
    } catch (e) { onError(e); } finally { setBusy(false); }
  };

  const input = "w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3.5 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none";
  return (
    <BottomSheet open={open} onClose={onClose} title="Nouvel administrateur">
      <p className="mb-3 text-[12.5px] text-gray-500">Le compte recevra un mot de passe provisoire qu&apos;il devra changer à sa 1ʳᵉ connexion.</p>
      <label className="mb-[7px] block text-[12.5px] font-bold text-gray-700">Nom</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
      <label className="mb-[7px] mt-3 block text-[12.5px] font-bold text-gray-700">E-mail</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      <label className="mb-[7px] mt-3 block text-[12.5px] font-bold text-gray-700">Rôle</label>
      <select value={role} onChange={(e) => setRole(e.target.value)} className={input}>
        {roles.filter((r) => r.id !== "super_admin").map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        <option value="super_admin">Super administrateur</option>
      </select>
      <label className="mb-[7px] mt-3 block text-[12.5px] font-bold text-gray-700">Mot de passe provisoire</label>
      <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" className={input} />
      <Button className="mt-5 w-full" disabled={busy} onClick={submit}>{busy ? "Création…" : "Créer l'administrateur"}</Button>
    </BottomSheet>
  );
}
