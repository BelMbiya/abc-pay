"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Link2, LifeBuoy, LogOut, ShieldQuestion, ShieldAlert, Star, User as UserIcon } from "lucide-react";
import { ListRow, VerifiedBadge, useToast } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { fetchMe, initials, type Profile } from "@/lib/profile-api";
import { lockMyAccount } from "@/lib/support-api";
import { PersonalInfoSheet } from "@/components/payer/PersonalInfoSheet";
import { SupportSheet } from "@/components/payer/SupportSheet";
import { ReviewSheet } from "@/components/payer/ReviewSheet";
import { KycUploadSheet } from "@/components/payer/KycUploadSheet";
import { fetchMyKyc, type KycStatusValue } from "@/lib/kyc-api";

const KYC_SUBTITLE: Record<KycStatusValue, string> = {
  none: "Vérifie ton identité avec ta pièce",
  pending: "Vérification en cours",
  approved: "Identité vérifiée ✓",
  rejected: "Refusée — reprends la vérification",
};

export default function ProfilPage() {
  const router = useRouter();
  const { logout, token, ready } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatusValue>("none");
  const [confirmLock, setConfirmLock] = useState(false);
  const [locking, setLocking] = useState(false);

  const load = useCallback(() => {
    fetchMe().then(setProfile).catch(() => {
      /* profil indisponible : on garde l'affichage minimal */
    });
    fetchMyKyc().then((k) => setKycStatus(k.kyc_status)).catch(() => {});
  }, []);

  useEffect(() => {
    if (ready && token) load();
  }, [ready, token, load]);

  const doLogout = () => {
    logout();
    showToast("À bientôt !");
    router.push("/bienvenue");
  };

  // Gel immédiat du compte (appareil perdu / accès suspect) → déconnexion forcée.
  const lockAccount = async () => {
    setLocking(true);
    try {
      await lockMyAccount();
      logout();
      showToast("Compte bloqué. Contacte le support pour le réactiver.");
      router.push("/bienvenue");
    } catch {
      showToast("Action impossible. Réessaie.");
      setLocking(false);
    }
  };

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

      {/* Bandeau de vérification par PIÈCE d'identité (KYC documentaire) */}
      {kycStatus !== "approved" ? (
        <button
          type="button"
          onClick={() => setKycOpen(true)}
          className={`mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left ${kycStatus === "rejected" ? "bg-[#FDE7E8]" : kycStatus === "pending" ? "bg-gray-100" : "bg-fee-bg"}`}
        >
          <BadgeCheck className={`size-5 shrink-0 ${kycStatus === "rejected" ? "text-red" : kycStatus === "pending" ? "text-gray-500" : "text-gold-600"}`} strokeWidth={2.2} />
          <div className="min-w-0 flex-1">
            <div className={`text-[13px] font-bold ${kycStatus === "rejected" ? "text-red" : kycStatus === "pending" ? "text-ink" : "text-gold-600"}`}>
              {kycStatus === "pending" ? "Vérification en cours" : kycStatus === "rejected" ? "Vérification refusée" : "Vérifie ton identité par pièce"}
            </div>
            <div className="text-[11.5px] text-gray-500">
              {kycStatus === "pending" ? "Tes pièces sont en cours d'examen." : kycStatus === "rejected" ? "Reprends la vérification avec de nouvelles pièces." : "Dépose ta pièce d'identité et un selfie."}
            </div>
          </div>
        </button>
      ) : null}

      {/* Options */}
      <div className="mt-6 flex flex-col gap-2.5">
        <ListRow icon={UserIcon} title="Informations personnelles" subtitle="Ton identité et tes coordonnées" onClick={() => setInfoOpen(true)} />
        <ListRow icon={BadgeCheck} title="Vérification d'identité (pièce)" subtitle={KYC_SUBTITLE[kycStatus]} onClick={() => setKycOpen(true)} />
        <ListRow icon={LifeBuoy} title="Support & aide" subtitle="Ouvrir un ticket, litige, problème d'accès" onClick={() => setSupportOpen(true)} />
        <ListRow icon={Star} title="Laisser un avis" subtitle="Ton témoignage peut apparaître sur notre page d'accueil" onClick={() => setReviewOpen(true)} />
        <ListRow icon={Link2} title="Comptes liés" subtitle="Mobile Money & banque connectés à ton compte" onClick={() => showToast("Bientôt disponible")} />
      </div>

      {/* Sécurité — bloquer mon compte (appareil perdu / compte usurpé) */}
      <div className="mt-6 rounded-2xl bg-gray-100 p-4">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="size-5 shrink-0 text-red" strokeWidth={2.2} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-ink">Bloquer mon compte</p>
            <p className="text-[11.5px] text-gray-500">Téléphone perdu ou activité suspecte ? Gèle tout immédiatement.</p>
          </div>
        </div>
        {confirmLock ? (
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={locking} onClick={() => setConfirmLock(false)} className="flex-1 rounded-pill border-[1.5px] border-gray-300 py-2.5 text-[12.5px] font-bold text-ink disabled:opacity-50">Annuler</button>
            <button type="button" disabled={locking} onClick={lockAccount} className="flex-1 rounded-pill bg-red py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50">{locking ? "Blocage…" : "Confirmer le blocage"}</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmLock(true)} className="mt-3 w-full rounded-pill bg-[#FDE7E8] py-2.5 text-[12.5px] font-bold text-red">Bloquer immédiatement</button>
        )}
      </div>

      <button
        type="button"
        onClick={doLogout}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-pill border-[1.5px] border-gray-300 py-3.5 text-[13.5px] font-bold text-red hover:bg-gray-100"
      >
        <LogOut className="size-4" strokeWidth={2.2} /> Déconnexion
      </button>

      <PersonalInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} onSaved={setProfile} />
      <KycUploadSheet open={kycOpen} onClose={() => setKycOpen(false)} status={kycStatus} onDone={(rec) => setKycStatus(rec.kyc_status)} />
      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
      <ReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} />
    </div>
  );
}
