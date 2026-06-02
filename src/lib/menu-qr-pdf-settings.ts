export type MenuQrPdfPageFormat = "a4" | "letter";
export type MenuQrPdfCodesPerPage = 4 | 6 | 9;

export type MenuQrPdfSettings = {
  /** Printed under each QR (defaults to restaurant name when empty). */
  sheetTitle: string;
  /** Small line under the title on each cell. */
  subtitle: string;
  codesPerPage: MenuQrPdfCodesPerPage;
  pageFormat: MenuQrPdfPageFormat;
  /** Center Rasvia logo on each QR code. */
  showCenterLogo: boolean;
  /** Print the public menu URL under each code. */
  showMenuUrl: boolean;
};

export const DEFAULT_MENU_QR_PDF_SETTINGS: MenuQrPdfSettings = {
  sheetTitle: "",
  subtitle: "Scan for menu",
  codesPerPage: 6,
  pageFormat: "a4",
  showCenterLogo: true,
  showMenuUrl: false,
};

function storageKey(restaurantId: number | string): string {
  return `rasvia:menu-qr-pdf-settings:${restaurantId}`;
}

export function loadMenuQrPdfSettings(restaurantId: number | string): MenuQrPdfSettings {
  if (typeof window === "undefined") return { ...DEFAULT_MENU_QR_PDF_SETTINGS };
  try {
    const raw = localStorage.getItem(storageKey(restaurantId));
    if (!raw) return { ...DEFAULT_MENU_QR_PDF_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MenuQrPdfSettings>;
    return {
      ...DEFAULT_MENU_QR_PDF_SETTINGS,
      ...parsed,
      codesPerPage: ([4, 6, 9] as const).includes(parsed.codesPerPage as MenuQrPdfCodesPerPage)
        ? (parsed.codesPerPage as MenuQrPdfCodesPerPage)
        : 6,
      pageFormat: parsed.pageFormat === "letter" ? "letter" : "a4",
    };
  } catch {
    return { ...DEFAULT_MENU_QR_PDF_SETTINGS };
  }
}

export function saveMenuQrPdfSettings(restaurantId: number | string, settings: MenuQrPdfSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(restaurantId), JSON.stringify(settings));
  } catch {
    /* ignore quota errors */
  }
}

export function gridForCodesPerPage(count: MenuQrPdfCodesPerPage): { cols: number; rows: number } {
  switch (count) {
    case 4:
      return { cols: 2, rows: 2 };
    case 9:
      return { cols: 3, rows: 3 };
    default:
      return { cols: 2, rows: 3 };
  }
}
