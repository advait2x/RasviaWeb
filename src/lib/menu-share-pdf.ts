import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import {
  DEFAULT_MENU_QR_PDF_SETTINGS,
  gridForCodesPerPage,
  type MenuQrPdfSettings,
} from "@/lib/menu-qr-pdf-settings";
import type { MenuQrSlot } from "@/lib/menu-qr-bindings";

const QR_CANVAS_PX = 640;

function rasviaLogoAbsoluteUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  try {
    return new URL("rasvia-logo-transparent.png", window.location.origin + base).href;
  } catch {
    return `${window.location.origin}/rasvia-logo-transparent.png`;
  }
}

/** QR as PNG data URL; optionally composites the Rasvia logo (requires high error correction). */
async function qrDataUrl(link: string, showCenterLogo: boolean): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = QR_CANVAS_PX;
  canvas.height = QR_CANVAS_PX;

  await QRCode.toCanvas(canvas, link, {
    width: QR_CANVAS_PX,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" },
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context for QR code.");
  }

  if (showCenterLogo) {
    const logoHref = rasviaLogoAbsoluteUrl();
    const logo = new Image();
    logo.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      logo.onload = () => resolve();
      logo.onerror = () => reject(new Error(`Could not load logo: ${logoHref}`));
      logo.src = logoHref;
    });

    /** ~38% of QR - errorCorrectionLevel H keeps scans reliable */
    const maxLogo = QR_CANVAS_PX * 0.38;
    const pad = QR_CANVAS_PX * 0.022;
    const scale = Math.min(maxLogo / logo.naturalWidth, maxLogo / logo.naturalHeight);
    const dw = logo.naturalWidth * scale;
    const dh = logo.naturalHeight * scale;
    const boxW = dw + pad * 2;
    const boxH = dh + pad * 2;
    const bx = (QR_CANVAS_PX - boxW) / 2;
    const by = (QR_CANVAS_PX - boxH) / 2;
    const lx = (QR_CANVAS_PX - dw) / 2;
    const ly = (QR_CANVAS_PX - dh) / 2;
    const radius = Math.min(10, QR_CANVAS_PX * 0.02);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, radius);
    ctx.fill();

    ctx.drawImage(logo, lx, ly, dw, dh);
  }

  return canvas.toDataURL("image/png");
}

/** QR as PNG data URL with Rasvia logo centered (requires high error correction). */
export async function qrDataUrlWithCenterLogo(link: string): Promise<string> {
  return qrDataUrl(link, true);
}

/** Match `TablesidePanel` / join links: production share host. */
export function publicSiteOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_JOIN_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://rasvia.com";
}

/** Public web menu / table QR URL (`RestaurantSharePreview` resolves slot at `/share`). */
export function buildPublicMenuShareUrl(restaurantId: number, slotIndex = 0): string {
  const base = publicSiteOrigin().replace(/\/$/, "");
  const u = new URL(`${base}/share`);
  u.searchParams.set("restaurantId", String(restaurantId));
  if (slotIndex > 0) {
    u.searchParams.set("slot", String(slotIndex));
  }
  return u.toString();
}

export type MenuQrPdfSlotLink = {
  url: string;
  caption: string;
  subtitle: string;
};

/** Build per-slot links and captions for PDF cells. */
export function buildMenuQrPdfSlotLinks(params: {
  restaurantId: number;
  restaurantName: string;
  settings: MenuQrPdfSettings;
  slots: MenuQrSlot[];
}): MenuQrPdfSlotLink[] {
  const { restaurantId, restaurantName, settings, slots } = params;
  const { cols, rows } = gridForCodesPerPage(settings.codesPerPage);
  const qrsPerPage = cols * rows;
  const sheetTitle = settings.sheetTitle.trim() || restaurantName.trim() || "Menu";
  const baseSubtitle = settings.subtitle.trim() || "Scan for menu";

  return Array.from({ length: qrsPerPage }, (_, i) => {
    const slot = slots[i];
    const url = buildPublicMenuShareUrl(restaurantId, slot?.slotIndex ?? i);
    if (slot?.mode === "table" && slot.tableLabel.trim()) {
      return {
        url,
        caption: slot.tableLabel.trim(),
        subtitle: baseSubtitle,
      };
    }
    return {
      url,
      caption: sheetTitle,
      subtitle: baseSubtitle,
    };
  });
}

/** Render PDF bytes (for preview blob URL or download). */
export async function buildMenuQrCodesPdfBlob(params: {
  restaurantId: number;
  restaurantName: string;
  settings?: Partial<MenuQrPdfSettings>;
  slots?: MenuQrSlot[];
}): Promise<{ blob: Blob; filename: string }> {
  const { restaurantId, restaurantName } = params;
  const settings: MenuQrPdfSettings = {
    ...DEFAULT_MENU_QR_PDF_SETTINGS,
    ...params.settings,
  };
  const slots =
    params.slots ??
    Array.from({ length: settings.codesPerPage }, (_, i) => ({
      slotIndex: i,
      mode: "menu" as const,
      tableLabel: "",
    }));
  const cellLinks = buildMenuQrPdfSlotLinks({
    restaurantId,
    restaurantName,
    settings,
    slots,
  });

  const qrImages = await Promise.all(
    cellLinks.map((cell) => qrDataUrl(cell.url, settings.showCenterLogo)),
  );

  const { cols, rows } = gridForCodesPerPage(settings.codesPerPage);
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

  for (let i = 0; i < qrsPerPage; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cellLeft = margin + c * (cellW + gap);
    const cellTop = margin + r * (cellH + gap);
    const cx = cellLeft + cellW / 2;
    const qrTop = cellTop + (cellH - qrSize) / 2 - 5;
    const qrX = cx - qrSize / 2;
    const cell = cellLinks[i];
    const link = cell?.url ?? buildPublicMenuShareUrl(restaurantId, i);

    doc.addImage(qrImages[i], "PNG", qrX, qrTop, qrSize, qrSize);

    doc.setFontSize(9);
    doc.setTextColor(32, 32, 32);
    const captionLines = doc.splitTextToSize(cell?.caption ?? "Menu", cellW - 4);
    let ty = qrTop + qrSize + 5;
    for (const line of captionLines) {
      doc.text(line, cx, ty, { align: "center" });
      ty += 4;
    }

    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text(cell?.subtitle ?? "Scan for menu", cx, ty + 1, { align: "center" });
    ty += 5;

    if (settings.showMenuUrl) {
      doc.setFontSize(5.5);
      doc.setTextColor(110, 110, 110);
      const urlLines = doc.splitTextToSize(link, cellW - 6);
      for (const line of urlLines.slice(0, 2)) {
        doc.text(line, cx, ty, { align: "center" });
        ty += 3.2;
      }
    }
  }

  const safeFileSlug =
    (settings.sheetTitle.trim() || restaurantName.trim() || "menu")
      .replace(/[^\w\d\-]+/g, "_")
      .slice(0, 48) || "menu";
  const filename = `rasvia-menu-qr-${safeFileSlug}.pdf`;
  const blob = doc.output("blob");
  return { blob, filename };
}

/**
 * One printable page with a grid of QR codes (per-slot URLs for table-linked slots).
 */
export async function downloadMenuQrCodesPdf(params: {
  restaurantId: number;
  restaurantName: string;
  settings?: Partial<MenuQrPdfSettings>;
  slots?: MenuQrSlot[];
}): Promise<void> {
  const { blob, filename } = await buildMenuQrCodesPdfBlob(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
