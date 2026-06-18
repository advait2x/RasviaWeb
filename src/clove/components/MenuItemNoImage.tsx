import { Camera } from "lucide-react";

/** Matches the RasviaTemplate menu card "No image" placeholder. */
export function MenuItemNoImage({
  className = "",
  label = "No image",
  compact = false,
}: {
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-shrink-0 flex-col items-center justify-center bg-secondary ${className}`}
      aria-hidden
    >
      <Camera
        size={compact ? 22 : 30}
        className="text-muted-foreground"
        strokeWidth={1.75}
      />
      <span
        className={`font-bold text-muted-foreground ${compact ? "mt-1 text-[10px]" : "mt-2 text-xs"}`}
      >
        {label}
      </span>
    </div>
  );
}
