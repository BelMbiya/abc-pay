"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Smartphone, Check, CameraOff, Keyboard, XCircle } from "lucide-react";
import jsQR from "jsqr";
import { Button, AmountInput, ListRow, Receipt } from "@/components/ui";
import { money, currencySymbol, currencyCode } from "@/lib/money";
import { mobileMethods } from "@/lib/payments-data";
import { parseAbcPayQr, type QrTarget } from "@/lib/qr";
import { channelId } from "@/lib/tuition-api";
import { recordTransaction } from "@/lib/transfers-api";

type Step = "scan" | "amount" | "method" | "success" | "failed";
type CamState = "idle" | "scanning" | "denied" | "unsupported" | "insecure";

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("scan");
  const [cam, setCam] = useState<CamState>("idle");
  const [target, setTarget] = useState<{ name: string; phone: string } | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState("");
  const [manual, setManual] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  /** Route selon la cible décodée. */
  const routeTarget = useCallback(
    (t: QrTarget) => {
      if (t.type === "tuition") {
        stopCamera();
        router.push(`/tuition?e=${encodeURIComponent(t.ref)}`);
      } else {
        stopCamera();
        setTarget({ name: t.name || t.phone, phone: t.phone });
        setStep("amount");
      }
    },
    [router, stopCamera],
  );

  // Boucle de détection : useCallback + ref (le ref rompt l'auto-référence).
  const tickRef = useRef<() => void>(() => {});
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(() => tickRef.current());
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (code) {
      const t = parseAbcPayQr(code.data);
      if (t) {
        routeTarget(t);
        return;
      }
      setNotice("QR non reconnu (ce n'est pas un code abc pay).");
    }
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [routeTarget]);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startCamera = useCallback(async () => {
    setNotice(null);
    // La caméra exige un contexte sécurisé (https ou localhost). Sur une IP réseau
    // en http, getUserMedia est indisponible → message dédié.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setCam("insecure");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCam("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCam("scanning");
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch {
      setCam("denied");
    }
  }, []);

  // Deep-link : /scan?t=user&r=<phone>&n=<name> (QR utilisateur scanné hors app).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- init depuis l'URL / caméra */
    const t = parseAbcPayQr(window.location.href);
    if (t?.type === "user") {
      setTarget({ name: t.name || t.phone, phone: t.phone });
      setStep("amount");
      return;
    }
    startCamera();
    return () => stopCamera();
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coupe la caméra dès qu'on quitte l'étape scan.
  useEffect(() => {
    if (step !== "scan") stopCamera();
  }, [step, stopCamera]);

  const submitManual = () => {
    const t = parseAbcPayQr(manual);
    if (t) routeTarget(t);
    else setNotice("Lien / code abc pay invalide.");
  };

  const back = () => {
    if (step === "scan") {
      stopCamera();
      router.push("/");
    } else if (step === "amount") {
      setStep("scan");
      startCamera();
    } else if (step === "method") setStep("amount");
    else router.push("/");
  };

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-5 py-4 md:py-8">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={back} aria-label="Retour" className="flex size-9 items-center justify-center rounded-lg bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <ArrowLeft className="size-[18px]" strokeWidth={2.2} />
        </button>
        <h1 className="font-display text-[16px] font-bold text-ink">Scanner un QR</h1>
      </div>

      {step === "scan" ? (
        <div className="flex flex-1 flex-col">
          <div className="relative overflow-hidden rounded-4xl bg-navy">
            <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {/* Cadre de visée */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-52 rounded-3xl border-[2.5px] border-gold-400">
                {cam === "scanning" ? <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-gold-400 shadow-[0_0_10px_var(--color-gold-400)]" /> : null}
              </div>
            </div>
            {cam !== "scanning" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy/85 px-6 text-center">
                <CameraOff className="size-8 text-gray-300" strokeWidth={1.6} />
                <p className="max-w-[280px] text-[12.5px] leading-relaxed text-gray-300">
                  {cam === "insecure"
                    ? "La caméra exige une connexion sécurisée. Ouvre l'app sur http://localhost:3000, ou lance-la en HTTPS (npm run dev:https) pour scanner depuis ton téléphone."
                    : cam === "denied"
                      ? "Accès caméra refusé. Autorise la caméra dans les réglages du navigateur, puis réessaie."
                      : cam === "unsupported"
                        ? "Caméra indisponible sur cet appareil."
                        : "Démarrage de la caméra…"}
                </p>
                {cam === "denied" || cam === "insecure" ? <button type="button" onClick={startCamera} className="mt-1 rounded-pill bg-white px-4 py-2 text-[12px] font-bold text-ink">Réessayer</button> : null}
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-center text-[12.5px] text-gray-500">Cadre un QR d&apos;établissement (paiement Tuition) ou d&apos;un utilisateur.</p>

          {/* Saisie manuelle (secours) */}
          <div className="mt-5 rounded-2xl bg-gray-100 p-4">
            <p className="mb-2 flex items-center gap-2 text-[12.5px] font-bold text-gray-700"><Keyboard className="size-4" strokeWidth={2} /> Saisir un lien / code</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Colle un lien abc pay"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-[11px] border-[1.5px] border-gray-100 bg-white px-3.5 py-2.5 text-[13px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <button type="button" onClick={submitManual} disabled={!manual.trim()} className="shrink-0 rounded-[11px] bg-grad-primary px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50">Ouvrir</button>
            </div>
          </div>

          {notice ? <p className="mt-3 text-center text-[12px] font-semibold text-red">{notice}</p> : null}
        </div>
      ) : null}

      {step === "amount" && target ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-3.5 flex items-center gap-2.5 rounded-xl bg-blue-100 px-3.5 py-3 text-[12px] font-bold text-blue-700">
            <BadgeCheck className="size-4 shrink-0" strokeWidth={2.2} /> Envoyer à {target.name} — {target.phone}
          </div>
          <p className="mb-1 text-[12.5px] font-bold text-gray-700">Montant</p>
          <AmountInput currency={currencySymbol(currencyCode())} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          <Button className="mt-6" disabled={!amount} onClick={() => setStep("method")}>Continuer</Button>
        </div>
      ) : null}

      {step === "method" ? (
        <div className="flex flex-1 flex-col gap-2.5">
          {mobileMethods.map((m) => (
            <ListRow key={m.id} icon={Smartphone} title={m.title} subtitle={m.sub} onClick={async () => {
              if (busy) return;
              setMethod(m.title);
              setBusy(true);
              // On ATTEND le résultat réel : aucun « succès » affiché sans confirmation.
              const res = await recordTransaction({ type: "send", amount, channel: channelId(m.title), counterparty_phone: target?.phone, counterparty_name: target?.name });
              setBusy(false);
              if (res.status === "echouee") {
                setReason(res.reason);
                setStep("failed");
              } else {
                setStep("success");
              }
            }} />
          ))}
        </div>
      ) : null}

      {step === "success" && target ? (
        <div className="flex flex-1 flex-col">
          <div className="py-2.5 text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-success-bg text-green">
              <Check className="size-7" strokeWidth={2.6} />
            </div>
            <h2 className="font-display text-[17px] font-bold text-ink">Envoi réussi</h2>
          </div>
          <Receipt
            amount={money(amount)}
            rows={[
              { label: "Bénéficiaire", value: target.name },
              { label: "Téléphone", value: target.phone },
              { label: "Moyen de paiement", value: method },
            ]}
          />
          <Button className="mt-5" onClick={() => router.push("/")}>Terminer</Button>
        </div>
      ) : null}

      {step === "failed" ? (
        <div className="flex flex-1 flex-col items-center gap-3 py-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#FDE7E8] text-red"><XCircle className="size-7" strokeWidth={2.4} /></div>
          <h2 className="font-display text-[17px] font-bold text-ink">Envoi échoué</h2>
          <p className="max-w-[300px] text-[12.5px] leading-relaxed text-gray-500">{reason ?? "L'opération n'a pas pu aboutir. Réessaie."}</p>
          <div className="mt-2 flex w-full max-w-[320px] gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("amount")}>Modifier</Button>
            <Button className="flex-1" onClick={() => router.push("/")}>Fermer</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
