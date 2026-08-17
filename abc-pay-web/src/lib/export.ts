/**
 * Exports comptables — PDF (jspdf) et Excel (.xls natif, sans dépendance).
 * Utilisés par les rapports établissement et les commissions admin, TOUJOURS
 * sur le jeu de lignes déjà filtré (le filtre courant est respecté par l'appelant).
 */
import { jsPDF } from "jspdf";

export interface ExportColumn {
  header: string;
  key: string;
  align?: "left" | "right";
}

export interface ExportOptions {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Array<Record<string, string | number>>;
  filename: string; // sans extension
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Journal au format PDF paysage (tableau dessiné, pagination automatique). */
export function exportPdf(o: ExportOptions): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const M = 12;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const usable = W - 2 * M;
  const colW = o.columns.map(() => usable / o.columns.length);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(11, 26, 68);
  doc.text(o.title, M, 16);
  if (o.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(o.subtitle, M, 22);
  }

  let y = 30;
  const drawHeader = () => {
    doc.setFillColor(0, 39, 156);
    doc.rect(M, y - 5, usable, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let x = M + 2;
    o.columns.forEach((c, i) => {
      const right = c.align === "right";
      doc.text(c.header, right ? x + colW[i] - 4 : x, y, { align: right ? "right" : "left" });
      x += colW[i];
    });
    y += 6;
  };

  const bodyFont = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(20, 30, 50);
  };

  drawHeader();
  bodyFont();
  o.rows.forEach((row, ri) => {
    if (y > H - 14) {
      doc.addPage();
      y = 18;
      drawHeader();
      bodyFont();
    }
    if (ri % 2 === 1) {
      doc.setFillColor(244, 247, 255);
      doc.rect(M, y - 4, usable, 5.5, "F");
    }
    let x = M + 2;
    o.columns.forEach((c, i) => {
      const right = c.align === "right";
      const v = String(row[c.key] ?? "").slice(0, 44);
      doc.text(v, right ? x + colW[i] - 4 : x, y, { align: right ? "right" : "left" });
      x += colW[i];
    });
    y += 5.5;
  });

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`abc pay — ${o.rows.length} ligne(s) · généré le ${new Date().toLocaleString("fr-FR")}`, M, H - 8);
  doc.save(`${o.filename}.pdf`);
}

/** Journal au format Excel (.xls) — tableau HTML lu nativement par Excel/LibreOffice. */
export function exportExcel(o: ExportOptions): void {
  const esc = (s: unknown) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const head = o.columns
    .map((c) => `<th style="background:#00279C;color:#fff;border:1px solid #ccc;padding:4px">${esc(c.header)}</th>`)
    .join("");
  const body = o.rows
    .map((r) => `<tr>${o.columns.map((c) => `<td style="border:1px solid #ccc;padding:4px">${esc(r[c.key])}</td>`).join("")}</tr>`)
    .join("");
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>` +
    `<x:Name>${esc(o.title)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>` +
    `</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>` +
    `<body><table>${`<tr>${head}</tr>`}${body}</table></body></html>`;
  triggerDownload(new Blob(["﻿", html], { type: "application/vnd.ms-excel" }), `${o.filename}.xls`);
}
