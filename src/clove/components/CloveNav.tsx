import { useState } from "react";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { ThemeIconToggle } from "@/components/ThemeToggle";
import { CLOVE_TABS, CLOVE_NAME, type CloveTabId } from "@/clove/data";

export function CloveNav({
  activeTab,
  onNavigate,
  cartCount,
  onOpenCart,
  onOpenProfile,
}: {
  activeTab: CloveTabId;
  onNavigate: (tab: CloveTabId) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenProfile: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b-2 border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Left: wordmark + theme toggle + tabs */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="flex-shrink-0 text-lg font-black tracking-tight text-foreground"
          >
            {CLOVE_NAME}
          </button>
          <ThemeIconToggle className="flex-shrink-0" />

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {CLOVE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: cart + profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Open cart"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
          >
            <ShoppingBag size={17} />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Open profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
          >
            <User size={17} />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary md:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen ? (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-3">
            {CLOVE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onNavigate(tab.id);
                  setMobileOpen(false);
                }}
                className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
