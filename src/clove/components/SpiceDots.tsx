import { getSpiceLevelStyle } from "@/clove/lib/spice";

export function SpiceDots({
  level,
  size = "sm",
}: {
  level: number;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(5, level));
  if (clamped === 0) return null;

  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`rounded-full ${dotSize}`}
          style={{
            backgroundColor:
              n <= clamped ? getSpiceLevelStyle(n).dotColor : "rgba(148,163,184,0.22)",
          }}
        />
      ))}
    </span>
  );
}
