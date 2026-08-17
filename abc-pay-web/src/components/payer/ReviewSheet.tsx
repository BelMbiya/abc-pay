"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { BottomSheet, Button, Field, useToast } from "@/components/ui";
import { submitReview } from "@/lib/reviews-api";
import { ApiError } from "@/lib/api";

/**
 * Laisser un avis — publié sur la landing après validation admin.
 * Réutilisable : par défaut côté payeur ; `base`/`token` ciblent l'espace établissement
 * (`/api/v1/staff` + token staff) pour recueillir l'avis d'un établissement partenaire.
 */
export function ReviewSheet({
  open,
  onClose,
  base,
  token,
  rolePlaceholder = "Ex : Parent, Étudiant",
}: {
  open: boolean;
  onClose: () => void;
  base?: string;
  token?: string;
  rolePlaceholder?: string;
}) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await submitReview(
        { rating, message: message.trim(), author_role: role.trim() || undefined },
        base || token ? { base, token } : undefined,
      );
      showToast("Merci ! Ton avis sera publié après validation.");
      setMessage("");
      setRole("");
      setRating(5);
      onClose();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? (e.fields ? Object.values(e.fields).flat()[0] ?? e.message : e.message)
          : "Envoi impossible. Réessaie.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Laisser un avis">
      <p className="text-[13px] leading-relaxed text-gray-500">
        Ton retour nous aide — les avis validés apparaissent sur notre page d&apos;accueil.
      </p>

      <div className="mt-4 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} étoile(s)`} className="p-0.5">
            <Star className={`size-7 ${n <= rating ? "fill-gold-500 text-gold-500" : "text-gray-300"}`} strokeWidth={1.5} />
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Field label="Ton rôle (optionnel)" placeholder={rolePlaceholder} value={role} onChange={(e) => setRole(e.target.value)} />
        <label className="mb-1.5 mt-3 block text-[12.5px] font-bold text-gray-700">
          Ton message<span className="ml-0.5 text-red">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Qu'as-tu pensé d'abc pay ?"
          className="w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 px-3.5 py-3 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
        />
      </div>

      {error ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}
      <Button className="mt-4" disabled={message.trim().length < 8 || saving} onClick={submit}>
        {saving ? "Envoi…" : "Envoyer mon avis"}
      </Button>
    </BottomSheet>
  );
}
