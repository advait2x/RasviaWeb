import { type ComponentType, createElement } from "react";
import QRCodeModule from "react-qr-code";

export type ResolvedQRCodeProps = {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: "L" | "M" | "H" | "Q";
  title?: string;
};

function FallbackQR({ value, size = 128 }: ResolvedQRCodeProps) {
  return createElement(
    "div",
    {
      className:
        "flex items-center justify-center rounded border border-zinc-600 bg-zinc-900 p-2 text-center text-[10px] text-zinc-400",
      style: { width: size, height: size },
      title: value,
    },
    "QR unavailable",
  );
}

/**
 * react-qr-code is CJS. Vite can surface `import X from` as:
 * - the component directly, or
 * - `{ default: Component }`, or nested `{ default: { default: Component } }`.
 * Rendering the wrapper object causes "Element type is invalid … got: object".
 *
 * The library's default export is `forwardRef(...)`, which is a **symbol-tagged
 * object**, not `typeof === "function"`. We must accept those as valid types.
 */
function isRenderableComponentType(x: unknown): x is ComponentType<ResolvedQRCodeProps> {
  if (typeof x === "function") return true;
  if (x != null && typeof x === "object" && "$$typeof" in x) {
    return typeof (x as { $$typeof: unknown }).$$typeof === "symbol";
  }
  return false;
}

function resolveQrExport(seed: unknown): ComponentType<ResolvedQRCodeProps> | null {
  let cur: unknown = seed;
  for (let i = 0; i < 6; i++) {
    if (isRenderableComponentType(cur)) {
      return cur;
    }
    if (cur && typeof cur === "object") {
      const o = cur as Record<string, unknown>;
      if (isRenderableComponentType(o.QRCode)) {
        return o.QRCode as ComponentType<ResolvedQRCodeProps>;
      }
      if ("default" in o) {
        cur = o.default;
        continue;
      }
    }
    break;
  }
  return null;
}

export const QRCode: ComponentType<ResolvedQRCodeProps> =
  resolveQrExport(QRCodeModule) ??
  (() => {
    console.error("[resolve-react-qr-code] react-qr-code did not resolve to a component; using fallback.");
    return FallbackQR;
  })();
