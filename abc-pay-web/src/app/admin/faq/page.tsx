"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { BottomSheet, Button, Field, useToast, useConfirm } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { fetchAdminFaqs, createFaq, updateFaq, deleteFaq, type AdminFaq, type FaqInput } from "@/lib/faq-api";

const EMPTY: FaqInput = { question: "", answer: "", category: "", position: 0, is_published: true };

export default function AdminFaqPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<AdminFaq[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<AdminFaq | null>(null);
  const [form, setForm] = useState<FaqInput>(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState("loading");
    fetchAdminFaqs()
      .then((r) => { setRows(r); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminFaqs()
      .then((r) => active && (setRows(r), setState("ready")))
      .catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (f: AdminFaq) => {
    setEditing(f);
    setForm({ question: f.question, answer: f.answer, category: f.category ?? "", position: f.position, is_published: f.is_published });
    setOpen(true);
  };

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) { showToast("Question et réponse obligatoires"); return; }
    setBusy(true);
    try {
      if (editing) await updateFaq(editing.id, form);
      else await createFaq(form);
      showToast(editing ? "Question mise à jour" : "Question ajoutée");
      setOpen(false);
      load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Enregistrement impossible");
    } finally { setBusy(false); }
  };

  const togglePublish = async (f: AdminFaq) => {
    try {
      await updateFaq(f.id, { is_published: !f.is_published });
      showToast(f.is_published ? "Retirée de la landing" : "Publiée sur la landing");
      load();
    } catch { showToast("Action impossible"); }
  };

  const remove = async (f: AdminFaq) => {
    const ok = await confirm({
      title: "Supprimer cette question ?",
      message: `« ${f.question} » sera définitivement supprimée.`,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteFaq(f.id);
      showToast("Question supprimée");
      load();
    } catch { showToast("Suppression impossible"); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-6 md:px-8 md:py-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">FAQ</h1>
          <p className="mt-1 text-[13px] text-gray-500">Gère les questions/réponses de la section « Questions » de la landing et de la page /faq. Les entrées <b>publiées</b> remplacent la FAQ par défaut du site.</p>
        </div>
        <Button icon={Plus} fullWidth={false} onClick={openNew} className="shrink-0">Ajouter</Button>
      </div>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">
          Chargement impossible. <button onClick={load} className="font-bold text-blue-600">Réessayer</button>
        </div>
      ) : state === "loading" ? (
        <div className="py-16 text-center text-[13px] text-gray-500">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">
          Aucune question. La landing affiche sa FAQ par défaut jusqu&apos;à ce que tu en publies.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((f) => (
            <div key={f.id} className="rounded-2xl bg-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {f.category ? <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-blue-600">{f.category}</span> : null}
                    <span className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${f.is_published ? "bg-success-bg text-green" : "bg-white text-gray-500"}`}>
                      {f.is_published ? "Publiée" : "Masquée"}
                    </span>
                    <span className="text-[10.5px] text-gray-500">#{f.position}</span>
                  </div>
                  <p className="mt-2 text-[14px] font-bold text-ink">{f.question}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-gray-500">{f.answer}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button onClick={() => togglePublish(f)} aria-label={f.is_published ? "Masquer" : "Publier"} className="flex size-9 items-center justify-center rounded-lg bg-white text-ink hover:bg-gray-300/40">
                    {f.is_published ? <EyeOff className="size-4" strokeWidth={2.2} /> : <Eye className="size-4" strokeWidth={2.2} />}
                  </button>
                  <button onClick={() => openEdit(f)} aria-label="Modifier" className="flex size-9 items-center justify-center rounded-lg bg-white text-blue-600 hover:bg-gray-300/40">
                    <Pencil className="size-4" strokeWidth={2.2} />
                  </button>
                  <button onClick={() => remove(f)} disabled={busy} aria-label="Supprimer" className="flex size-9 items-center justify-center rounded-lg bg-white text-red hover:bg-gray-300/40 disabled:opacity-50">
                    <Trash2 className="size-4" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title={editing ? "Modifier la question" : "Nouvelle question"}>
        <Field label="Catégorie (optionnel)" placeholder="Général, Paiements, Sécurité…" value={form.category ?? ""} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} />
        <Field label="Question" placeholder="Faut-il installer une application ?" value={form.question} onChange={(e) => setForm((s) => ({ ...s, question: e.target.value }))} required />
        <label className="mb-[7px] mt-3.5 block text-[12.5px] font-bold text-gray-700">Réponse<span className="ml-0.5 text-red" aria-hidden="true">*</span></label>
        <textarea
          value={form.answer}
          onChange={(e) => setForm((s) => ({ ...s, answer: e.target.value }))}
          rows={5}
          placeholder="Non. abc pay est une web app : elle s'ouvre dans le navigateur…"
          className="w-full resize-y rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3.5 text-[14px] leading-relaxed text-ink placeholder:text-gray-500 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
        />
        <Field label="Ordre d'affichage" type="number" min={0} value={String(form.position ?? 0)} onChange={(e) => setForm((s) => ({ ...s, position: Number(e.target.value) || 0 }))} />
        <label className="mt-3.5 flex items-center gap-2.5 text-[13px] font-semibold text-ink">
          <input type="checkbox" checked={form.is_published ?? true} onChange={(e) => setForm((s) => ({ ...s, is_published: e.target.checked }))} className="size-4 accent-blue-600" />
          Publiée sur la landing
        </label>
        <Button className="mt-5 w-full" disabled={busy} onClick={save}>{editing ? "Enregistrer" : "Ajouter la question"}</Button>
      </BottomSheet>
    </div>
  );
}
