import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  /** Extra classes on the outer wrapper */
  className?: string;
  /** Classes on the inner content wrapper (above ambient layers) */
  contentClassName?: string;
  /** Set false to hide ambient gradient orbs (e.g. if the page adds its own hero) */
  showAmbient?: boolean;
};

/**
 * Shared dark shell: background tokens + subtle ambient depth.
 * Use across marketing routes, auth, admin, and partner surfaces for visual consistency.
 */
export function AppShell({ children, className, contentClassName, showAmbient = true }: AppShellProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-x-hidden bg-background text-foreground",
        className,
      )}
    >
      {showAmbient ? (
        <div className="pointer-events-none fixed inset-0 z-0">
          <div
            className="absolute left-1/3 top-0 h-[420px] w-[560px] rounded-full opacity-[0.14]"
            style={{
              background: "radial-gradient(ellipse, var(--ambient-spot-1) 0%, transparent 72%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 h-[360px] w-[480px] rounded-full opacity-[0.1]"
            style={{
              background: "radial-gradient(ellipse, var(--ambient-spot-2) 0%, transparent 70%)",
            }}
          />
        </div>
      ) : null}
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}
