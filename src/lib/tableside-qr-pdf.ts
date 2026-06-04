// Printable sheet of fixed per-table QR codes for self-order tableside.
import { jsPDF } from "jspdf";
import { publicSiteOrigin } from "@/lib/menu-share-pdf";
import { qrDataUrlWithCenterLogo } from "@/lib/menu-share-pdf";
import {
  DEFAULT_TABLESIDE_QR_PDF_SETTINGS,
  gridForTablesideCodesPerPage,
  type TablesideQrPdfSettings,
} from "@/lib/tableside-qr-pdf-settings";
import type { TablesideTable } from "@/lib/tableside-tables";

/** Canonical short join URL: `<origin>/t/{code}`. */
export function buildTableJoinUrl(code: string): string {
  const base = publicSiteOrigin().replace(/\/$/, "");
  const trimmed = code.trim();
  return `${base}/t/${encodeURIComponent(trimmed)}`;
}

/** @deprecated Legacy label-based URL; kept for backwards compatibility in docs only. */
export function buildLegacyTableJoinUrl(restaurantId: number, tableLabel: string): string {
  const base = publicSiteOrigin().replace(/\/$/, "");
  const u = new URL(`${base}/t`);
  u.searchParams.set("r", String(restaurantId));
  u.searchParams.set("table", tableLabel);
  return u.toString();
}

async function qrForLink(link: string, showCenterLogo: boolean): Promise<string> {
  if (showCenterLogo) return qrDataUrlWithCenterLogo(link);
  const { default: QRCode } = await import("qrcode");
  return QRCode.toDataURL(link, { width: 640, margin: 1, errorCorrectionLevel: "H" });
}

/**
 * Multi-page PDF with one QR per table. Layout follows saved settings (4/6/9 per page).
 */
export async function downloadTablesideQrCodesPdf(params: {
  restaurantName: string;
  tables: TablesideTable[];
  settings?: Partial<TablesideQrPdfSettings>;
}): Promise<void> {
  const { restaurantName, tables } = params;
  if (tables.length === 0) {
    throw new Error("Add at least one table before downloading QR codes.");
  }

  const settings: TablesideQrPdfSettings = {
    ...DEFAULT_TABLESIDE_QR_PDF_SETTINGS,
    ...params.settings,
  };

  const cells = tables.map((t) => ({
    url: buildTableJoinUrl(t.code),
    caption: t.display_name,
    subtitle: settings.subtitle.trim() || "Scan to order & pay",
  }));

  const restaurantCaption = settings.sheetTitle.trim() || restaurantName.trim() || "Rasvia";

  const qrByUrl = new Map<string, string>();
  for (const cell of cells) {
    if (qrByUrl.has(cell.url)) continue;
    qrByUrl.set(cell.url, await qrForLink(cell.url, settings.showCenterLogo));
  }

  const { cols, rows } = gridForTablesideCodesPerPage(settings.codesPerPage);
  const qrsPerPage = cols * rows;

  const doc = new jsPDF({
    unit: "mm",
    format: settings.pageFormat,
    orientation: "portrait",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const gap = 6;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const cellW = (usableW - gap * (cols - 1)) / cols;
  const cellH = (usableH - gap * (rows - 1)) / rows;
  const qrSize = Math.min(cellW, cellH) * 0.52;

  doc.setFont("helvetica", "normal");

  cells.forEach((cell, idx) => {
    const slot = idx % qrsPerPage;
    if (idx > 0 && slot === 0) {
      doc.addPage();
    }
    const r = Math.floor(slot / cols);
    const c = slot % cols;
    const cellLeft = margin + c * (cellW + gap);
    const cellTop = margin + r * (cellH + gap);
    const cx = cellLeft + cellW / 2;
    const qrTop = cellTop + (cellH - qrSize) / 2 - 6;
    const qrX = cx - qrSize / 2;

    const dataUrl = qrByUrl.get(cell.url)!;
    doc.addImage(dataUrl, "PNG", qrX, qrTop, qrSize, qrSize);

    let ty = qrTop + qrSize + 5;

    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    const labelLines = doc.splitTextToSize(cell.caption, cellW - 4);
    for (const line of labelLines) {
      doc.text(line, cx, ty, { align: "center" });
      ty += 5;
    }

    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(cell.subtitle, cx, ty + 0.5, { align: "center" });

    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    const restLines = doc.splitTextToSize(restaurantCaption, cellW - 4);
    let ry = ty + 5;
    for (const line of restLines) {
      doc.text(line, cx, ry, { align: "center" });
      ry += 3.5;
    }

    if (settings.showShortUrl) {
      doc.setFontSize(5.5);
      doc.setTextColor(110, 110, 110);
      const urlLines = doc.splitTextToSize(cell.url, cellW - 6);
      let uy = ry + 3;
      for (const line of urlLines.slice(0, 2)) {
        doc.text(line, cx, uy, { align: "center" });
        uy += 3.2;
      }
    }
  });

  const safeSlug =
    restaurantCaption.replace(/[^\w\d\-]+/g, "_").slice(0, 48) || "restaurant";
  doc.save(`rasvia-tableside-qr-${safeSlug}.pdf`);
}
