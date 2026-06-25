import { SPICE_LABELS, getSpiceLevelStyle } from "@/clove/lib/spice";
import { SpiceDots } from "@/clove/components/SpiceDots";

export function SpiceIndicator({
  level,
  variant = "dots",
  size = "sm",
}: {
  level: number;
  variant?: "pill" | "dots";
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(5, level));
  if (clamped === 0) return null;

  const style = getSpiceLevelStyle(clamped);
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  if (variant === "dots") return <SpiceDots level={clamped} size={size} />;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${textSize} font-bold`}
      style={{
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
      }}
    >
      <SpiceDots level={clamped} size={size} />
      {SPICE_LABELS[clamped]}
    </span>
  );
}
