import { jsPDF } from "jspdf";
import QRCode from "qrcode";

const QR_CANVAS_PX = 640;

function rasviaLogoAbsoluteUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  try {
    return new URL("rasvia-logo-transparent.png", window.location.origin + base).href;
  } catch {
    return `${window.location.origin}/rasvia-logo-transparent.png`;
  }
}

/** QR as PNG data URL with Rasvia logo centered (requires high error correction). */
async function qrDataUrlWithCenterLogo(link: string): Promise<string> {
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

  const logoHref = rasviaLogoAbsoluteUrl();
  const logo = new Image();
  logo.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    logo.onload = () => resolve();
    logo.onerror = () => reject(new Error(`Could not load logo: ${logoHref}`));
    logo.src = logoHref;
  });

  /** ~38% of QR — errorCorrectionLevel H keeps scans reliable */
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

  return canvas.toDataURL("image/png");
}

/** Match `TablesidePanel` / join links: production share host. */
function publicSiteOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_JOIN_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://rasvia.com";
}

/** Public web menu preview (`RestaurantSharePreview` at `/share`). */
export function buildPublicMenuShareUrl(restaurantId: number): string {
  const base = publicSiteOrigin().replace(/\/$/, "");
  const u = new URL(`${base}/share`);
  u.searchParams.set("restaurantId", String(restaurantId));
  return u.toString();
}

const COLS = 2;
const ROWS = 3;
const QRS_PER_PAGE = COLS * ROWS;

/**
 * One A4 page with a 2×3 grid of identical QR codes (same menu URL).
 * Useful for trimming into table tents or stickers.
 */
export async function downloadMenuQrCodesPdf(params: {
  restaurantId: number;
  restaurantName: string;
}): Promise<void> {
  const { restaurantId, restaurantName } = params;
  const link = buildPublicMenuShareUrl(restaurantId);
  const dataUrl = await qrDataUrlWithCenterLogo(link);

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
  const caption = restaurantName.trim() || "Menu";

  doc.setFont("helvetica", "normal");

  for (let i = 0; i < QRS_PER_PAGE; i++) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const cellLeft = margin + c * (cellW + gap);
    const cellTop = margin + r * (cellH + gap);
    const cx = cellLeft + cellW / 2;
    const qrTop = cellTop + (cellH - qrSize) / 2 - 5;
    const qrX = cx - qrSize / 2;

    doc.addImage(dataUrl, "PNG", qrX, qrTop, qrSize, qrSize);

    doc.setFontSize(9);
    doc.setTextColor(32, 32, 32);
    const captionLines = doc.splitTextToSize(caption, cellW - 4);
    let ty = qrTop + qrSize + 5;
    for (const line of captionLines) {
      doc.text(line, cx, ty, { align: "center" });
      ty += 4;
    }

    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text("Scan for menu", cx, ty + 1, { align: "center" });
  }

  const safeFileSlug = caption.replace(/[^\w\d\-]+/g, "_").slice(0, 48) || "menu";
  doc.save(`rasvia-menu-qr-${safeFileSlug}.pdf`);
}
