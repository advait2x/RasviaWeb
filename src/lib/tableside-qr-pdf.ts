// src/lib/tableside-qr-pdf.ts
// Printable sheet of fixed per-table QR codes for self-order tableside.
// Each QR encodes `<origin>/t?r=<restaurantId>&table=<label>` which resolves
// to the table's shared self-serve group order (see TableJoin.tsx). Mirrors
// the approach in menu-share-pdf.ts.
import { jsPDF } from "jspdf";
import { publicSiteOrigin, qrDataUrlWithCenterLogo } from "@/lib/menu-share-pdf";

/** Canonical fixed-table QR target used by both the printed sheet and the on-screen preview. */
export function buildTableJoinUrl(restaurantId: number, tableLabel: string): string {
  const base = publicSiteOrigin().replace(/\/$/, "");
  const u = new URL(`${base}/t`);
  u.searchParams.set("r", String(restaurantId));
  u.searchParams.set("table", tableLabel);
  return u.toString();
}

const COLS = 2;
const ROWS = 3;
const QRS_PER_PAGE = COLS * ROWS;

/**
 * Multi-page A4 sheet with one QR per table label (2×3 per page). Each cell is
 * captioned with the table label so the printout can be trimmed into per-table
 * tents or stickers.
 */
export async function downloadTablesideQrCodesPdf(params: {
  restaurantId: number;
  restaurantName: string;
  labels: string[];
}): Promise<void> {
  const { restaurantId, restaurantName, labels } = params;
  const cleanLabels = labels.map((l) => l.trim()).filter(Boolean);
  if (cleanLabels.length === 0) {
    throw new Error("Add at least one table before downloading QR codes.");
  }

  // Pre-render every QR (with centered logo) before laying out pages.
  const qrByLabel = new Map<string, string>();
  for (const label of cleanLabels) {
    if (qrByLabel.has(label)) continue;
    const dataUrl = await qrDataUrlWithCenterLogo(buildTableJoinUrl(restaurantId, label));
    qrByLabel.set(label, dataUrl);
  }

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const gap = 6;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const cellW = (usableW - gap * (COLS - 1)) / COLS;
  const cellH = (usableH - gap * (ROWS - 1)) / ROWS;
  const qrSize = Math.min(cellW, cellH) * 0.52;
  const restaurantCaption = restaurantName.trim() || "Rasvia";

  doc.setFont("helvetica", "normal");

  cleanLabels.forEach((label, idx) => {
    const slot = idx % QRS_PER_PAGE;
    if (idx > 0 && slot === 0) {
      doc.addPage();
    }
    const r = Math.floor(slot / COLS);
    const c = slot % COLS;
    const cellLeft = margin + c * (cellW + gap);
    const cellTop = margin + r * (cellH + gap);
    const cx = cellLeft + cellW / 2;
    const qrTop = cellTop + (cellH - qrSize) / 2 - 6;
    const qrX = cx - qrSize / 2;

    const dataUrl = qrByLabel.get(label)!;
    doc.addImage(dataUrl, "PNG", qrX, qrTop, qrSize, qrSize);

    let ty = qrTop + qrSize + 5;

    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    const labelLines = doc.splitTextToSize(label, cellW - 4);
    for (const line of labelLines) {
      doc.text(line, cx, ty, { align: "center" });
      ty += 5;
    }

    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text("Scan to order & pay", cx, ty + 0.5, { align: "center" });

    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    const restLines = doc.splitTextToSize(restaurantCaption, cellW - 4);
    let ry = ty + 5;
    for (const line of restLines) {
      doc.text(line, cx, ry, { align: "center" });
      ry += 3.5;
    }
  });

  const safeSlug =
    restaurantCaption.replace(/[^\w\d\-]+/g, "_").slice(0, 48) || "restaurant";
  doc.save(`rasvia-tableside-qr-${safeSlug}.pdf`);
}
