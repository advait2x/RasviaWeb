export type TablesideQrPdfPageFormat = "a4" | "letter";
export type TablesideQrPdfCodesPerPage = 4 | 6 | 9;

export type TablesideQrPdfSettings = {
  /** Printed under each QR (defaults to restaurant name when empty). */
  sheetTitle: string;
  /** Small line under the table name on each cell. */
  subtitle: string;
  codesPerPage: TablesideQrPdfCodesPerPage;
  pageFormat: TablesideQrPdfPageFormat;
  /** Center Rasvia logo on each QR code. */
  showCenterLogo: boolean;
  /** Print the short join URL under each code. */
  showShortUrl: boolean;
};

export const DEFAULT_TABLESIDE_QR_PDF_SETTINGS: TablesideQrPdfSettings = {
  sheetTitle: "",
  subtitle: "Scan to order & pay",
  codesPerPage: 6,
  pageFormat: "a4",
  showCenterLogo: true,
  showShortUrl: false,
};

function storageKey(restaurantId: number | string): string {
  return `rasvia:tableside-qr-pdf-settings:${restaurantId}`;
}

export function loadTablesideQrPdfSettings(restaurantId: number | string): TablesideQrPdfSettings {
  if (typeof window === "undefined") return { ...DEFAULT_TABLESIDE_QR_PDF_SETTINGS };
  try {
    const raw = localStorage.getItem(storageKey(restaurantId));
    if (!raw) return { ...DEFAULT_TABLESIDE_QR_PDF_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<TablesideQrPdfSettings>;
    return {
      ...DEFAULT_TABLESIDE_QR_PDF_SETTINGS,
      ...parsed,
      codesPerPage: ([4, 6, 9] as const).includes(parsed.codesPerPage as TablesideQrPdfCodesPerPage)
        ? (parsed.codesPerPage as TablesideQrPdfCodesPerPage)
        : 6,
      pageFormat: parsed.pageFormat === "letter" ? "letter" : "a4",
    };
  } catch {
    return { ...DEFAULT_TABLESIDE_QR_PDF_SETTINGS };
  }
}

export function saveTablesideQrPdfSettings(
  restaurantId: number | string,
  settings: TablesideQrPdfSettings,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(restaurantId), JSON.stringify(settings));
  } catch {
    /* ignore quota errors */
  }
}

export function gridForTablesideCodesPerPage(count: TablesideQrPdfCodesPerPage): {
  cols: number;
  rows: number;
} {
  switch (count) {
    case 4:
      return { cols: 2, rows: 2 };
    case 9:
      return { cols: 3, rows: 3 };
    default:
      return { cols: 2, rows: 3 };
  }
}
