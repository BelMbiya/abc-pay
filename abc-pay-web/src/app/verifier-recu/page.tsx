"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/money";

/**
 * Page publique de vérification d'authenticité d'un reçu (anti-fraude).
 *
 * Politique : le SERVEUR fait foi. On envoie soit le jeton (lu du QR), soit le
 * n° + code court (saisie manuelle) ; le serveur répond avec les données
 * canoniques. Le verdict n'est jamais décidé côté client — on l'affiche, et on
 * invite à COMPARER les valeurs avec le papier (une falsification du montant/nom
 * imprimé apparaît alors comme une incohérence).
 */

interface VerifiedReceipt {
  number: string;
  status: string;
  type: string | null;
  establishment: string | null;
  student_name: string | null;
  student_matricule: string | null;
  fee_type: string | null;
  amount: number;
  currency: string;
  channel: string;
  date: string | null;
}

type Verdict = { state: "authentic" | "flagged" | "unknown"; receipt?: VerifiedReceipt };

const STATUS_LABEL: Record<string, string> = {
  confirmee: "confirmé",
  annulee: "annulé",
  remboursee: "remboursé",
  echouee: "échoué",
};

const CHANNEL_LABEL: Record<string, string> = {
  mpesa: "M-Pesa",
  airtel: "Airtel Money",
  orange: "Orange Money",
  africell: "Africell Money",
  visa: "Carte bancaire",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

export default function VerifierRecuPage() {
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const runVerify = useCallback(async (body: { token?: string; number?: string; code?: string }) => {
    setLoading(true);
    setError(null);
    setVerdict(null);
    try {
      const res = await api.post<{ valid: boolean; receipt: VerifiedReceipt | null }>(
        "/api/v1/receipts/verify",
        body,
      );
      if (!res.valid || !res.receipt) {
        setVerdict({ state: "unknown" });
      } else {
        const authentic = res.receipt.status === "confirmee";
        setVerdict({ state: authentic ? "authentic" : "flagged", receipt: res.receipt });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Vérification impossible. Réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Vérification automatique quand la page est ouverte via le QR (?t=<jeton>).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (!t) return;
    const id = window.setTimeout(() => runVerify({ token: t }), 0);
    return () => window.clearTimeout(id);
  }, [runVerify]);

  const tokenFromScan = (text: string): string | null => {
    try {
      const u = new URL(text.trim(), window.location.origin);
      const t = u.searchParams.get("t");
      if (t) return t;
    } catch {
      /* pas une URL */
    }
    return /^[A-Za-z0-9]{16,64}$/.test(text.trim()) ? text.trim() : null;
  };

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    if (!window.isSecureContext) {
      setError("La caméra exige HTTPS. Utilise la saisie manuelle ci-dessous.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const tick = () => {
        if (!streamRef.current || !ctx) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (qr) {
            const tok = tokenFromScan(qr.data);
            if (tok) {
              stopCamera();
              runVerify({ token: tok });
              return;
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Caméra indisponible. Utilise la saisie manuelle ci-dessous.");
      setScanning(false);
    }
  }, [runVerify, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !code.trim()) return;
    runVerify({ number: number.trim(), code: code.trim() });
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[560px] flex-col px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/bienvenue" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="abc pay" width={30} height={30} className="rounded" />
          <span className="font-display text-[17px] font-extrabold tracking-tight text-ink">abc pay</span>
        </Link>
        <Link href="/" className="text-[13px] font-semibold text-blue-600 hover:underline">
          Accueil
        </Link>
      </header>

      <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink md:text-[26px]">
        Vérifier un reçu
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-500">
        Scanne le QR du reçu, ou saisis son numéro et son code. abc pay interroge son serveur et affiche
        les valeurs officielles — <span className="font-semibold text-gray-700">compare-les avec le papier</span>.
      </p>

      {/* Scan caméra */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-300 bg-navy">
        {scanning ? (
          <div className="relative">
            <video ref={videoRef} className="h-[240px] w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-0 m-auto h-40 w-40 rounded-xl border-2 border-gold-500" />
          </div>
        ) : (
          <div className="flex h-[120px] flex-col items-center justify-center gap-2 text-center">
            <span className="text-[13px] text-white/70">Scanner le QR du reçu</span>
          </div>
        )}
        <div className="border-t border-white/10 p-3">
          {scanning ? (
            <Button variant="ghost" className="w-full text-white" onClick={stopCamera}>
              Arrêter la caméra
            </Button>
          ) : (
            <Button className="w-full" onClick={startCamera} disabled={loading}>
              Ouvrir la caméra
            </Button>
          )}
        </div>
      </div>

      {/* Saisie manuelle */}
      <form onSubmit={submitManual} className="mt-4 rounded-2xl border border-gray-300 bg-white p-4">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-gray-500">
          Ou vérifier manuellement
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-[11.5px] font-semibold text-gray-700">Numéro du reçu</span>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="RC-2026-00042"
              className="rounded-xl border border-gray-300 px-3 py-2.5 text-[15px] text-ink outline-none focus:border-blue-600"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11.5px] font-semibold text-gray-700">Code de vérification</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="8 caractères"
              maxLength={8}
              className="rounded-xl border border-gray-300 px-3 py-2.5 text-[15px] uppercase tracking-widest text-ink outline-none focus:border-blue-600"
            />
          </label>
        </div>
        <Button type="submit" className="mt-3 w-full" disabled={loading || !number.trim() || !code.trim()}>
          {loading ? "Vérification…" : "Vérifier ce reçu"}
        </Button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-[13px] text-red">{error}</div>
      )}

      {verdict && <VerdictCard verdict={verdict} />}
    </main>
  );
}

function VerdictCard({ verdict }: { verdict: Verdict }) {
  if (verdict.state === "unknown") {
    return (
      <div className="mt-5 rounded-2xl border border-red/30 bg-red/5 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red text-[20px] font-bold text-white">
            ✕
          </span>
          <div>
            <div className="font-display text-[17px] font-extrabold text-red">Reçu non reconnu</div>
            <div className="text-[12.5px] text-gray-500">
              Aucun reçu authentique ne correspond. Méfiance : possible faux ou données altérées.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const r = verdict.receipt!;
  const flagged = verdict.state === "flagged";
  const bg = flagged ? "bg-gold-500/10 border-gold-500/40" : "bg-green/5 border-green/30";

  const rows: Array<[string, string]> = [
    ["Établissement", r.establishment ?? "—"],
    ["Élève / Étudiant", r.student_name ?? "—"],
    ["Matricule", r.student_matricule ?? "—"],
    ["Type de frais", r.fee_type ?? "—"],
    ["Montant", money(r.amount, r.currency)],
    ["Moyen", CHANNEL_LABEL[r.channel] ?? r.channel],
    ["Date", formatDate(r.date)],
  ];

  return (
    <div className={`mt-5 rounded-2xl border p-5 ${bg}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full text-[20px] font-bold text-white ${
            flagged ? "bg-gold-600" : "bg-green"
          }`}
        >
          {flagged ? "!" : "✓"}
        </span>
        <div>
          <div className={`font-display text-[17px] font-extrabold ${flagged ? "text-gold-600" : "text-green"}`}>
            {flagged ? `Reçu authentique — mais ${STATUS_LABEL[r.status] ?? r.status}` : "Reçu authentique"}
          </div>
          <div className="text-[12.5px] text-gray-500">
            Reçu n° {r.number} · émis par abc pay
          </div>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-gray-300/60 rounded-xl bg-white/70 px-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-[12.5px] text-gray-500">{label}</dt>
            <dd className="text-right text-[13.5px] font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-[12px] leading-relaxed text-gray-700">
        Compare ces valeurs officielles avec le reçu papier. La moindre différence (montant, nom, élève)
        signale une falsification.
      </p>
    </div>
  );
}
