import { CLOVE_TABS, CLOVE_NAME, type CloveTabId } from "@/clove/data";

export function CloveFooter({
  onNavigate,
}: {
  onNavigate: (tab: CloveTabId) => void;
}) {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          {/* Big brand + tab links */}
          <div>
            <p className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {CLOVE_NAME}
            </p>
            <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {CLOVE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onNavigate(tab.id)}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Powered by Rasvia (logo wordmark) */}
          <div className="flex items-center gap-2 sm:flex-col sm:items-end">
            <span className="text-xs font-medium text-muted-foreground">Powered by</span>
            <a href="/" className="inline-flex items-center" aria-label="Rasvia">
              <img
                src="/rasvia-logo-transparent.png"
                alt="Rasvia"
                className="h-6 w-auto"
              />
            </a>
          </div>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          {new Date().getFullYear()} {CLOVE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
