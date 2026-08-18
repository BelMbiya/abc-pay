"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Search, GraduationCap, BadgeCheck, Smartphone, CreditCard, Check, Download, Share2, UserCheck, XCircle,
} from "lucide-react";
import {
  Button, Field, AmountInput, Chip, ChipGroup, ListRow, Recap, RecapRow, Receipt, useToast,
} from "@/components/ui";
import { money, currencySymbol } from "@/lib/money";
import {
  schools, fieldSets, paymentMethods, studentInfo, requiredFieldIds,
  type School, type PaymentMethod,
} from "@/lib/tuition-data";
import { fetchEstablishments, createTuitionPayment, channelId } from "@/lib/tuition-api";
import { downloadReceipt, shareReceipt, type ReceiptData } from "@/lib/receipt";
import { useAuth } from "@/lib/auth-context";

type Step = "school" | "student" | "payer" | "fees" | "method" | "confirm" | "receipt" | "failed";
const ORDER: Step[] = ["school", "student", "payer", "fees", "method", "confirm", "receipt"];
const RELATIONS = ["Parent", "Tuteur", "Étudiant", "Proche"];

const TITLES: Record<Step, string> = {
  school: "Choisir l'établissement",
  student: "Élève / étudiant",
  payer: "Informations du payeur",
  fees: "Frais à régler",
  method: "Moyen de paiement",
  confirm: "Récapitulatif",
  receipt: "Reçu de paiement",
  failed: "Paiement échoué",
};

export default function TuitionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("school");
  const [query, setQuery] = useState("");
  const [schoolList, setSchoolList] = useState<School[]>(schools);
  const [school, setSchool] = useState<School | null>(null);
  const [apiReceipt, setApiReceipt] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState<null | "dl" | "sh">(null);

  // Charge les établissements depuis l'API (repli sur les données mock).
  useEffect(() => {
    fetchEstablishments().then(setSchoolList);
  }, []);
  const [student, setStudent] = useState<Record<string, string>>({});
  const [payer, setPayer] = useState({ nom: "Mbuyi", postnom: "Kalonji", prenom: "Grace", tel: "+243 81 234 56 78", relation: "Parent" });
  const [feeType, setFeeType] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  // Deep-link QR : ?e=<code|id> → présélectionne l'établissement et passe à l'élève.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- réaction au chargement des établissements */
    if (school) return;
    const ref = new URLSearchParams(window.location.search).get("e");
    if (!ref) return;
    const found = schoolList.find((s) => s.id === ref || s.code === ref);
    if (found) {
      setSchool(found);
      setStudent({});
      setStep("student");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [schoolList, school]);

  const goto = (s: Step) => setStep(s);
  const back = () => {
    const i = ORDER.indexOf(step);
    if (i <= 0) router.push("/");
    else if (step === "receipt") router.push("/");
    else setStep(ORDER[i - 1]);
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schoolList.filter((s) => !q || s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q));
  }, [query, schoolList]);

  // RÈGLE : aucun frais à la charge du payeur — il paie exactement le montant.
  // La commission abc pay est prélevée côté établissement (invisible pour le payeur).
  const total = amount;
  const fullName = [student.nom, student.postnom, student.prenom].filter(Boolean).join(" ");

  // Plafond par frais : chaque type de frais a un montant (preset apparié) ; le
  // payeur peut régler CE montant ou moins (paiement partiel), jamais plus.
  const feeAmount = (f: string) => (school ? (school.presets[school.fees.indexOf(f)] ?? 0) : 0);
  const feeMax = feeType && school ? feeAmount(feeType) : 0;
  const selectFee = (f: string) => {
    setFeeType(f);
    setAmount(feeAmount(f)); // défaut = montant plein du frais
  };
  // Saisie LIBRE : on n'écrase pas la valeur (pas de clamp à chaque frappe, sinon
  // toute édition dépassant transitoirement le max « remonte » au montant plein et
  // empêche de saisir un montant partiel). Le dépassement est signalé plus bas et
  // bloque « Continuer » ; le serveur recalcule/valide le plafond de toute façon.
  const onAmount = (v: number) => setAmount(Math.max(0, v));
  const overMax = feeMax > 0 && amount > feeMax;
  const txId = useMemo(() => "TUI-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase(), []);

  const pickSchool = (s: School) => {
    setSchool(s);
    setStudent({});
    goto("student");
  };
  const openFees = () => {
    if (school && !feeType) {
      setFeeType(school.fees[0]);
      setAmount(feeAmount(school.fees[0]));
    }
    goto("fees");
  };
  const pickMethod = (m: PaymentMethod) => {
    setMethod(m);
    goto("confirm");
  };

  /**
   * « C'est moi » (étape PAYEUR) = le payeur est la personne CONNECTÉE : on reprend
   * son identité de session (nom du compte, découpé, + téléphone du compte).
   */
  const fillMyself = () => {
    const parts = (user?.name ?? "").trim().split(/\s+/).filter(Boolean);
    const [nom, postnom, prenom] = parts.length >= 3
      ? [parts[0], parts[1], parts.slice(2).join(" ")]
      : parts.length === 2
        ? [parts[0], "", parts[1]]
        : ["", "", parts[0] ?? ""];
    setPayer((p) => ({
      ...p,
      nom: nom || p.nom,
      postnom: postnom || p.postnom,
      prenom: prenom || p.prenom,
      tel: user?.phone ?? p.tel,
    }));
    showToast("Infos reprises de ton compte");
  };

  /**
   * À l'étape ÉLÈVE : le compte connecté est lui-même l'étudiant → on reprend le
   * nom de son profil. Si le profil est incomplet (aucun nom), on le SIGNALE.
   */
  const fillStudentFromMe = () => {
    const name = (user?.name ?? "").trim();
    if (!name) {
      showToast("Profil incomplet : ajoute ton nom dans « Profil » pour te préremplir");
      return;
    }
    const parts = name.split(/\s+/);
    setStudent((s) => ({
      ...s,
      nom: parts[0] ?? "",
      postnom: parts.length > 2 ? (parts[1] ?? "") : "",
      prenom: parts.length > 2 ? parts.slice(2).join(" ") : (parts[1] ?? ""),
    }));
    showToast("Tes informations ont été reprises");
  };
  const submitPayment = async () => {
    if (!school || !method) return;
    setSubmitting(true);
    setPayError(null);
    const res = await createTuitionPayment({
      establishment_id: school.id,
      student_name: fullName,
      student_matricule: student.matricule ?? "",
      student_info: studentInfo(school.level, student),
      payer_name: [payer.nom, payer.postnom, payer.prenom].filter(Boolean).join(" "),
      payer_phone: payer.tel,
      payer_relation: payer.relation,
      fee_type: feeType,
      channel: channelId(method.title),
      amount,
      reference,
    });
    setSubmitting(false);
    // Aucun succès silencieux : on n'affiche le reçu QUE si le paiement est confirmé.
    if (res.status === "echouee") {
      setPayError(res.reason);
      goto("failed");
      return;
    }
    // Passerelle CinetPay : on ouvre la page de paiement hébergée. La confirmation
    // (et le reçu) arrivent ensuite via webhook — pas d'affichage de reçu ici.
    if (res.redirectUrl) {
      window.location.href = res.redirectUrl;
      return;
    }
    // Push direct (Araka) : pas de page hébergée, la transaction est « pending » → on suit
    // le statut (le payeur valide sur son téléphone) jusqu'à confirmation.
    if (res.status === "pending" && res.transactionId) {
      router.push(`/paiement/statut?tx=${res.transactionId}`);
      return;
    }
    setApiReceipt(res.receiptNumber);
    setApiToken(res.receiptToken);
    goto("receipt");
  };

  /** Construit les données du reçu PDF à partir de l'état courant. */
  const buildReceipt = (): ReceiptData | null => {
    if (!school || !method) return null;
    return {
      number: apiReceipt ?? txId,
      amountLabel: `${money(total, school?.currency ?? "USD")}`,
      establishment: school.name,
      student: fullName,
      studentInfo: studentInfo(school.level, student),
      feeType,
      method: method.title,
      payer: `${[payer.nom, payer.postnom, payer.prenom].filter(Boolean).join(" ")} (${payer.relation})`,
      reference: reference || undefined,
      qrToken: apiToken ?? undefined, // authenticité : QR + code de vérification sur le reçu
      // Aucun frais payeur (Tuition) → pas de ligne de frais dans le reçu.
    };
  };

  const handleDownload = async () => {
    const data = buildReceipt();
    if (!data) return;
    setBusy("dl");
    try {
      await downloadReceipt(data);
      showToast("Reçu téléchargé");
    } catch {
      showToast("Échec du téléchargement");
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    const data = buildReceipt();
    if (!data) return;
    setBusy("sh");
    try {
      const r = await shareReceipt(data);
      showToast(r === "shared" ? "Reçu partagé" : "Reçu téléchargé");
    } catch {
      showToast("Partage indisponible");
    } finally {
      setBusy(null);
    }
  };

  const stepIndex = ORDER.indexOf(step);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-5 py-4 md:py-8">
      {/* En-tête de flux : retour + titre + progression */}
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Retour"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={2.2} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-[16px] font-bold text-ink">{TITLES[step]}</h1>
          {step !== "receipt" ? (
            <p className="text-[11px] font-semibold text-gray-500">Étape {stepIndex + 1} / 6</p>
          ) : null}
        </div>
      </div>
      {/* Barre de progression */}
      {step !== "receipt" ? (
        <div className="mb-5 h-1 overflow-hidden rounded-pill bg-gray-100">
          <div
            className="h-full rounded-pill bg-grad-primary transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / 6) * 100}%` }}
          />
        </div>
      ) : null}

      {/* ── ÉTAPE : établissement ─────────────────────────────── */}
      {step === "school" ? (
        <div className="flex flex-1 flex-col">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-gray-500" strokeWidth={2} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom de l'école, université..."
              autoComplete="off"
              className="w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 py-3.5 pl-11 pr-4 text-[14.5px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2.5">
            {results.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-gray-500">Aucun établissement trouvé.</p>
            ) : (
              results.map((s) => (
                <ListRow key={s.id} icon={GraduationCap} title={s.name} subtitle={`${s.type} : ${s.city}`} onClick={() => pickSchool(s)} />
              ))
            )}
          </div>
        </div>
      ) : null}

      {/* ── ÉTAPE : élève / étudiant ──────────────────────────── */}
      {step === "student" && school ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-3.5 flex items-center gap-2.5 rounded-xl bg-blue-100 px-3.5 py-3 text-[12px] font-bold text-blue-700">
            <BadgeCheck className="size-4 shrink-0" strokeWidth={2.2} />
            <span>{school.name} : code marchand <b>{school.code}</b></span>
          </div>
          {user ? (
            <button
              type="button"
              onClick={fillStudentFromMe}
              className="mb-3 flex items-center gap-2 self-start rounded-pill border-[1.5px] border-blue-500 bg-blue-100 px-3.5 py-2 text-[12.5px] font-bold text-blue-700 transition-colors hover:bg-blue-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <UserCheck className="size-4" strokeWidth={2.2} />
              C&apos;est moi — je suis l&apos;étudiant
            </button>
          ) : null}
          <div className="flex flex-col">
            {fieldSets[school.level].map((f) => (
              <Field
                key={f.id}
                label={f.label}
                placeholder={f.placeholder}
                required={f.required}
                value={student[f.id] ?? ""}
                onChange={(e) => setStudent((p) => ({ ...p, [f.id]: e.target.value }))}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-500"><span className="text-red">*</span> Champs obligatoires</p>
          <Button
            className="mt-4"
            disabled={requiredFieldIds(school.level).some((id) => !(student[id] ?? "").trim())}
            onClick={() => goto("payer")}
          >
            Continuer
          </Button>
        </div>
      ) : null}

      {/* ── ÉTAPE : payeur ────────────────────────────────────── */}
      {step === "payer" ? (
        <div className="flex flex-1 flex-col">
          {user ? (
            <button
              type="button"
              onClick={fillMyself}
              className="mb-1 flex items-center gap-2 self-start rounded-pill border-[1.5px] border-blue-500 bg-blue-100 px-3.5 py-2 text-[12.5px] font-bold text-blue-700 transition-colors hover:bg-blue-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <UserCheck className="size-4" strokeWidth={2.2} />
              C&apos;est moi (mon compte)
            </button>
          ) : null}
          <Field label="Nom" required value={payer.nom} onChange={(e) => setPayer((p) => ({ ...p, nom: e.target.value }))} />
          <Field label="Post-nom" value={payer.postnom} onChange={(e) => setPayer((p) => ({ ...p, postnom: e.target.value }))} />
          <Field label="Prénom" required value={payer.prenom} onChange={(e) => setPayer((p) => ({ ...p, prenom: e.target.value }))} />
          <Field label="Téléphone" required type="tel" inputMode="tel" value={payer.tel} onChange={(e) => setPayer((p) => ({ ...p, tel: e.target.value }))} />
          <p className="mb-[7px] mt-3.5 text-[12.5px] font-bold text-gray-700">
            Relation<span className="ml-0.5 text-red">*</span>
          </p>
          <ChipGroup>
            {RELATIONS.map((r) => (
              <Chip key={r} selected={payer.relation === r} onClick={() => setPayer((p) => ({ ...p, relation: r }))}>{r}</Chip>
            ))}
          </ChipGroup>
          <p className="mt-3 text-[11px] text-gray-500"><span className="text-red">*</span> Champs obligatoires</p>
          <Button
            className="mt-4"
            disabled={!payer.nom.trim() || !payer.prenom.trim() || !payer.tel.trim() || !payer.relation}
            onClick={openFees}
          >
            Continuer
          </Button>
        </div>
      ) : null}

      {/* ── ÉTAPE : frais ─────────────────────────────────────── */}
      {step === "fees" && school ? (
        <div className="flex flex-1 flex-col">
          <p className="mb-[7px] text-[12.5px] font-bold text-gray-700">Type de frais<span className="ml-0.5 text-red">*</span></p>
          <ChipGroup>
            {school.fees.map((f) => (
              <Chip key={f} selected={feeType === f} onClick={() => selectFee(f)}>
                {f} · {feeAmount(f)} {currencySymbol(school.currency ?? "USD")}
              </Chip>
            ))}
          </ChipGroup>
          <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Montant<span className="ml-0.5 text-red">*</span></p>
          <ChipGroup className="mb-1.5">
            <Chip selected={amount === feeMax} onClick={() => setAmount(feeMax)}>Montant plein · {feeMax} {currencySymbol(school.currency ?? "USD")}</Chip>
            <Chip selected={amount === Math.round(feeMax / 2)} onClick={() => setAmount(Math.round(feeMax / 2))}>Moitié · {Math.round(feeMax / 2)} {currencySymbol(school.currency ?? "USD")}</Chip>
          </ChipGroup>
          <AmountInput currency={currencySymbol(school?.currency ?? "USD")} value={amount || ""} onChange={(e) => onAmount(Number(e.target.value) || 0)} />
          {overMax ? (
            <p className="mt-1.5 text-[11.5px] font-semibold text-red">
              Maximum {feeMax} {currencySymbol(school.currency ?? "USD")} pour « {feeType} ». Tu peux régler ce montant ou moins (paiement partiel), jamais plus.
            </p>
          ) : (
            <p className="mt-1.5 text-[11.5px] text-gray-500">
              Frais <b className="text-gray-700">{feeType}</b> : {feeMax} {currencySymbol(school.currency ?? "USD")}. Tu peux régler ce montant ou moins (paiement partiel), jamais plus.
            </p>
          )}
          <Field label="Référence (optionnel)" placeholder="Ex : REF-2026-0456" value={reference} onChange={(e) => setReference(e.target.value)} />
          <Button className="mt-6" onClick={() => goto("method")} disabled={!amount || amount > feeMax}>Continuer</Button>
        </div>
      ) : null}

      {/* ── ÉTAPE : moyen de paiement ─────────────────────────── */}
      {step === "method" ? (
        <div className="flex flex-1 flex-col gap-2.5">
          {paymentMethods.map((m) => (
            <ListRow
              key={m.id}
              icon={m.id === "visa" ? CreditCard : Smartphone}
              title={m.title}
              subtitle={m.subtitle}
              onClick={() => pickMethod(m)}
            />
          ))}
        </div>
      ) : null}

      {/* ── ÉTAPE : récapitulatif ─────────────────────────────── */}
      {step === "confirm" && school && method ? (
        <div className="flex flex-1 flex-col">
          <Recap>
            <RecapRow label="Établissement" value={school.name} />
            <RecapRow label="Élève / Étudiant" value={`${fullName}, ${studentInfo(school.level, student)}`} />
            <RecapRow label="Type de frais" value={feeType} />
            <RecapRow label="Payeur" value={`${[payer.nom, payer.postnom, payer.prenom].filter(Boolean).join(" ")} (${payer.relation})`} />
            <RecapRow label="Moyen de paiement" value={method.title} />
          </Recap>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-success-bg px-3.5 py-2.5 text-[11.5px] font-semibold text-green">
            <BadgeCheck className="size-4 shrink-0" strokeWidth={2.2} />
            <span>Aucun frais à ta charge — tu paies exactement le montant.</span>
          </div>
          <Recap>
            <RecapRow label="Total à payer" value={`${money(total, school?.currency ?? "USD")}`} />
          </Recap>
          <Button className="mt-5" disabled={submitting} onClick={submitPayment}>
            {submitting ? "Traitement…" : "Confirmer le paiement"}
          </Button>
        </div>
      ) : null}

      {/* ── ÉTAPE : reçu ──────────────────────────────────────── */}
      {step === "receipt" && school && method ? (
        <div className="flex flex-1 flex-col">
          <div className="py-2.5 text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-success-bg text-green">
              <Check className="size-7" strokeWidth={2.6} />
            </div>
            <h2 className="font-display text-[17px] font-bold text-ink">Paiement Tuition réussi</h2>
          </div>
          <Receipt
            amount={`${money(total, school?.currency ?? "USD")}`}
            rows={[
              { label: "N° de transaction", value: apiReceipt ?? txId },
              { label: "Établissement", value: school.name },
              { label: "Élève / Étudiant", value: fullName },
              { label: "Type de frais", value: feeType },
              { label: "Moyen de paiement", value: method.title },
              { label: "Frais à ta charge", value: "Aucun" },
            ]}
          />
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={busy !== null} onClick={handleDownload} icon={Download}>
              {busy === "dl" ? "Génération…" : "Télécharger"}
            </Button>
            <Button variant="outline" disabled={busy !== null} onClick={handleShare} icon={Share2}>
              {busy === "sh" ? "Préparation…" : "Partager"}
            </Button>
          </div>
          <Button className="mt-5" onClick={() => router.push("/")}>Terminer</Button>
        </div>
      ) : null}

      {step === "failed" ? (
        <div className="flex flex-1 flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#FDE7E8] text-red"><XCircle className="size-7" strokeWidth={2.4} /></div>
          <h2 className="font-display text-[17px] font-bold text-ink">Paiement échoué</h2>
          <p className="max-w-[320px] text-[12.5px] leading-relaxed text-gray-500">{payError ?? "Le paiement n'a pas pu aboutir. Réessaie."}</p>
          <div className="mt-2 flex w-full max-w-[340px] gap-2">
            <Button variant="outline" className="flex-1" onClick={() => goto("confirm")}>Réessayer</Button>
            <Button className="flex-1" onClick={() => router.push("/")}>Fermer</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
