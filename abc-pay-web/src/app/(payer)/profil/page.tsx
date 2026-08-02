"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Link2, Lock, LogOut, ShieldQuestion, User as UserIcon } from "lucide-react";
import { ListRow, VerifiedBadge, useToast } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { fetchMe, initials, type Profile } from "@/lib/profile-api";
import { PersonalInfoSheet } from "@/components/payer/PersonalInfoSheet";

export default function ProfilPage() {
  const router = useRouter();
  const { logout, token, ready } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const load = useCallback(() => {
    fetchMe().then(setProfile).catch(() => {
      /* profil indisponible : on garde l'affichage minimal */
    });
  }, []);

  useEffect(() => {
    if (ready && token) load();
  }, [ready, token, load]);

  const name = profile?.name?.trim() || "Ton profil";
  const kyc = profile?.kyc_complete ?? false;

  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6">
      {/* En-tête profil */}
      <div className="flex items-center gap-3.5">
        <div className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-blue-500),var(--color-navy))] font-display text-[17px] font-bold text-white">
          {profile ? initials(profile.name, profile.phone) : ""}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15.5px] font-bold text-ink">{name}</div>
          <div className="text-[12px] text-gray-500">{profile?.phone ?? ""}</div>
        </div>
        {kyc ? <VerifiedBadge /> : null}
      </div>

      {/* Bandeau de complétion KYC si profil incomplet */}
      {profile && !kyc ? (
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-fee-bg px-4 py-3.5 text-left"
        >
          <ShieldQuestion className="size-5 shrink-0 text-gold-600" strokeWidth={2.2} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-gold-600">Complète ton profil</div>
            <div className="text-[11.5px] text-gray-500">Vérifie ton identité pour sécuriser ton compte.</div>
          </div>
        </button>
      ) : null}

      {/* Options */}
      <div className="mt-6 flex flex-col gap-2.5">
        <ListRow icon={UserIcon} title="Informations personnelles" subtitle="Ton identité et tes coordonnées" onClick={() => setInfoOpen(true)} />
        <ListRow icon={BadgeCheck} title="KYC & vérification" subtitle={kyc ? "Compte vérifié" : "Vérifie ton identité"} onClick={() => setInfoOpen(true)} />
        <ListRow icon={Link2} title="Comptes liés" subtitle="Mobile Money & banque connectés à ton compte" onClick={() => showToast("Bientôt disponible")} />
        <ListRow icon={Lock} title="Sécurité" subtitle="Comment abc pay protège chacun de tes paiements" onClick={() => showToast("Bientôt disponible")} />
      </div>

      <button
        type="button"
        onClick={() => {
          logout();
          showToast("À bientôt !");
          router.push("/bienvenue");
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-pill border-[1.5px] border-gray-300 py-3.5 text-[13.5px] font-bold text-red hover:bg-gray-100"
      >
        <LogOut className="size-4" strokeWidth={2.2} /> Déconnexion
      </button>

      <PersonalInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} onSaved={setProfile} />
    </div>
  );
}
