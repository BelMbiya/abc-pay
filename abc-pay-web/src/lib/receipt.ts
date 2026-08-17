/**
 * Génération du reçu de paiement en PDF (client-side, jsPDF).
 *
 * Rendu vectoriel de marque abc pay : en-tête navy + logo, accent or, montant,
 * badge PAYÉ, tableau des détails, pied sécurisé. Aucun appel réseau (hors logo local).
 *
 * NB couleurs : jsPDF ne lit pas les variables CSS ; les valeurs ci-dessous
 * DUPLIQUENT volontairement les tokens de `src/app/globals.css` (@theme) et doivent
 * rester synchronisées avec eux. Unique endroit où ces hex sont admis hors du thème.
 */
import { jsPDF } from "jspdf";
import { generateQrDataUrl, receiptVerifyUrl } from "./qr";

// Palette (miroir des tokens globals.css) — [R, G, B].
const C = {
  navy: [15, 27, 48],
  navy2: [22, 35, 60],
  gold: [245, 166, 35],
  gold400: [255, 194, 75],
  ink: [16, 24, 38],
  gray700: [59, 68, 82],
  gray500: [107, 116, 132],
  gray300: [198, 205, 214],
  gray100: [238, 241, 245],
  green: [27, 166, 114],
  white: [255, 255, 255],
} as const;

/** Type d'action → détermine le gabarit (sous-titre, badge, libellé du montant, lignes). */
export type ReceiptKind = "tuition" | "send" | "receive" | "service";

export interface ReceiptData {
  number: string; // n° de transaction / reçu
  amountLabel: string; // ex. "204 $"
  kind?: ReceiptKind; // défaut : "tuition"
  // Champs Tuition
  establishment?: string;
  student?: string;
  studentInfo?: string; // classe / faculté…
  feeType?: string;
  payer?: string;
  // Champs Envoi / Réception / Service
  counterpartyName?: string; // destinataire (envoi) / expéditeur (réception)
  counterpartyPhone?: string;
  note?: string; // libellé / motif du service
  // Communs
  method: string;
  reference?: string;
  feeLabel?: string; // ligne de frais (optionnelle ; absente = aucun frais payeur)
  feeValue?: string;
  dateLabel?: string; // horodatage lisible ; défaut = maintenant (fr-FR)
  qrToken?: string; // jeton d'authenticité (reçus Tuition) → QR + code de vérification
}

/** Métadonnées de gabarit par type d'action (sous-titre, badge, libellé du montant). */
const KIND_META: Record<ReceiptKind, { subtitle: string; badge: string; amountLabel: string; credit: boolean }> = {
  tuition: { subtitle: "Preuve de paiement de scolarité", badge: "PAYÉ", amountLabel: "Montant payé", credit: false },
  send: { subtitle: "Preuve d'envoi d'argent", badge: "ENVOYÉ", amountLabel: "Montant envoyé", credit: false },
  receive: { subtitle: "Preuve de réception d'argent", badge: "REÇU", amountLabel: "Montant reçu", credit: true },
  service: { subtitle: "Preuve de paiement de service", badge: "PAYÉ", amountLabel: "Montant payé", credit: false },
};

/** Construit les lignes de détail selon le type d'action. */
function detailRows(d: ReceiptData): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const kind = d.kind ?? "tuition";

  if (kind === "tuition") {
    rows.push(["Établissement", d.establishment || "—"]);
    rows.push(["Élève / Étudiant", d.student || "—"]);
    if (d.studentInfo) rows.push(["Classe / Filière", d.studentInfo]);
    if (d.feeType) rows.push(["Type de frais", d.feeType]);
    if (d.payer) rows.push(["Payeur", d.payer]);
  } else if (kind === "send") {
    if (d.counterpartyName) rows.push(["Destinataire", d.counterpartyName]);
    if (d.counterpartyPhone) rows.push(["Téléphone", d.counterpartyPhone]);
    if (d.note) rows.push(["Motif", d.note]);
  } else if (kind === "receive") {
    if (d.counterpartyName) rows.push(["Expéditeur", d.counterpartyName]);
    if (d.counterpartyPhone) rows.push(["Téléphone", d.counterpartyPhone]);
    if (d.note) rows.push(["Motif", d.note]);
  } else {
    // service
    rows.push(["Service", d.note || d.feeType || "Paiement de service"]);
    if (d.counterpartyName) rows.push(["Bénéficiaire", d.counterpartyName]);
    if (d.counterpartyPhone) rows.push(["Référence service", d.counterpartyPhone]);
  }

  rows.push(["Moyen de paiement", d.method]);
  if (d.reference) rows.push(["Référence", d.reference]);
  if (d.feeLabel && d.feeValue) rows.push([d.feeLabel, d.feeValue]);
  else if (kind === "tuition") rows.push(["Frais à votre charge", "Aucun"]);

  return rows;
}

/** Nom de fichier normalisé pour le reçu. */
export function receiptFilename(d: ReceiptData): string {
  const safe = d.number.replace(/[^a-z0-9-]/gi, "").toUpperCase() || "ABCPAY";
  return `recu-abc-pay-${safe}.pdf`;
}

/** Charge le logo local en data-URL (best-effort : sans logo, on retombe sur le wordmark). */
async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Construit le document PDF du reçu. */
export async function buildReceiptPdf(d: ReceiptData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a5" }); // 148 × 210 mm
  const W = 148;
  const M = 14;
  const rightX = W - M;
  const meta = KIND_META[d.kind ?? "tuition"];

  const fill = (c: readonly number[]) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);

  // ── En-tête navy ────────────────────────────────────────────
  fill(C.navy);
  doc.rect(0, 0, W, 40, "F");
  fill(C.navy2);
  doc.rect(0, 30, W, 10, "F"); // léger dégradé simulé

  const logo = await loadLogo();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", M, 12, 15, 15);
    } catch {
      /* logo illisible : ignoré */
    }
  }
  ink(C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("abc pay", logo ? M + 19 : M, 21);
  ink(C.gold400);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(meta.subtitle, logo ? M + 19 : M, 27);

  // Bloc n° de reçu (à droite)
  ink(C.gray300);
  doc.setFontSize(7);
  doc.text("REÇU N°", rightX, 16, { align: "right" });
  ink(C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(d.number, rightX, 22, { align: "right" });

  // Accent or
  fill(C.gold);
  doc.rect(0, 40, W, 1.6, "F");

  // ── Montant + statut ────────────────────────────────────────
  ink(C.gray500);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(meta.amountLabel, W / 2, 53, { align: "center" });

  ink(C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text(d.amountLabel, W / 2, 66, { align: "center" });

  // Badge statut (pilule verte) — libellé selon le type (PAYÉ / ENVOYÉ / REÇU)
  doc.setFontSize(9);
  const pillW = Math.max(26, doc.getTextWidth(meta.badge) + 12);
  const pillX = (W - pillW) / 2;
  fill(C.green);
  doc.roundedRect(pillX, 70, pillW, 8, 4, 4, "F");
  ink(C.white);
  doc.text(meta.badge, W / 2, 75.4, { align: "center" });

  // ── Carte des détails (lignes adaptées au type d'action) ────
  const rows = detailRows(d);

  const cardX = M;
  const cardY = 84;
  const cardW = W - 2 * M;
  const rowH = 9.5;
  const padY = 8;
  const cardH = rows.length * rowH + padY * 2;

  fill(C.gray100);
  doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, "F");

  let y = cardY + padY + 4;
  const labelX = cardX + 8;
  const valueX = cardX + cardW - 8;
  doc.setFontSize(9);
  rows.forEach(([label, value], i) => {
    // séparateur pointillé entre lignes
    if (i > 0) {
      doc.setDrawColor(C.gray300[0], C.gray300[1], C.gray300[2]);
      doc.setLineDashPattern([0.6, 0.9], 0);
      doc.setLineWidth(0.2);
      doc.line(labelX, y - rowH + 3.5, valueX, y - rowH + 3.5);
      doc.setLineDashPattern([], 0);
    }
    ink(C.gray500);
    doc.setFont("helvetica", "normal");
    doc.text(label, labelX, y);
    ink(C.ink);
    doc.setFont("helvetica", "bold");
    doc.text(clip(doc, value, cardW - 16 - doc.getTextWidth(label) - 6), valueX, y, { align: "right" });
    y += rowH;
  });

  // ── Pied + bloc d'authenticité (QR + code) ──────────────────
  const date = d.dateLabel ?? new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
  const footY = cardY + cardH + 8;
  doc.setDrawColor(C.gray300[0], C.gray300[1], C.gray300[2]);
  doc.setLineWidth(0.2);
  doc.line(M, footY, rightX, footY);

  // QR de vérification (à droite) — encode le lien de vérification (jeton serveur).
  let leftW = W - 2 * M;
  if (d.qrToken) {
    try {
      const qr = await generateQrDataUrl(receiptVerifyUrl(d.qrToken), 240);
      const qs = 22;
      const qx = rightX - qs;
      const qy = footY + 4;
      doc.addImage(qr, "PNG", qx, qy, qs, qs);
      ink(C.gray500);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.6);
      doc.text("VÉRIFIER CE REÇU", qx + qs / 2, qy + qs + 3, { align: "center" });
      leftW = qx - M - 6;
    } catch {
      /* QR indisponible : reçu émis sans QR (la voie manuelle reste possible) */
    }
  }

  ink(C.gray500);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Émis le ${date}`, M, footY + 6);
  doc.text("Conserve ce reçu comme preuve de paiement.", M, footY + 11, { maxWidth: leftW });

  if (d.qrToken) {
    const code = d.qrToken.slice(0, 8).toUpperCase();
    ink(C.gray700);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`Authenticité — N° ${d.number} · Code ${code}`, M, footY + 18, { maxWidth: leftW });
    ink(C.gray300);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Scanne le QR, ou saisis ces valeurs sur la page « Vérifier un reçu » d'abc pay.", M, footY + 23, {
      maxWidth: leftW,
    });
  } else {
    ink(C.gray300);
    doc.text("Ce reçu atteste l'encaissement via la plateforme abc pay.", M, footY + 18, { maxWidth: leftW });
  }

  return doc;
}

/** Tronque une valeur trop large pour tenir sur la ligne (ajoute une ellipse). */
function clip(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
  return t + "…";
}

/** Télécharge le reçu (PDF). */
export async function downloadReceipt(d: ReceiptData): Promise<void> {
  const doc = await buildReceiptPdf(d);
  doc.save(receiptFilename(d));
}

/**
 * Partage le reçu via l'API Web Share (fichier PDF) si disponible ;
 * sinon retombe sur le téléchargement. Renvoie l'action réellement effectuée.
 */
export async function shareReceipt(d: ReceiptData): Promise<"shared" | "downloaded"> {
  const doc = await buildReceiptPdf(d);
  const blob = doc.output("blob");
  const file = new File([blob], receiptFilename(d), { type: "application/pdf" });

  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Reçu abc pay", text: `Reçu ${d.number}` });
      return "shared";
    } catch (e) {
      // annulation utilisateur : ne pas retomber sur le téléchargement
      if (e instanceof DOMException && e.name === "AbortError") return "shared";
    }
  }
  doc.save(receiptFilename(d));
  return "downloaded";
}
