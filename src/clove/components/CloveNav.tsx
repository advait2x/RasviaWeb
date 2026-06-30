import { useEffect, useState } from "react";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { ThemeIconToggle } from "@/components/ThemeToggle";
import { CloveThemeSwitcher } from "@/clove/components/CloveThemeSwitcher";
import { MKT_TOP_BAR_THEME_TOGGLE } from "@/lib/marketingUi";
import { cn } from "@/lib/utils";
import { CLOVE_TABS, CLOVE_NAME, type CloveTabId } from "@/clove/data";
import { useCloveAuth } from "@/clove/CloveAuthContext";

function profileInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

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
  const { avatarUrl, displayName, email } = useCloveAuth();

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const profileLabel = displayName?.trim() || email?.trim() || "Log in";

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 flex flex-col border-b border-white/10 bg-black",
        mobileOpen && "h-dvh md:h-auto",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between px-6 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="flex-shrink-0 text-xl font-black tracking-tight text-white"
          >
            {CLOVE_NAME}
          </button>
          <ThemeIconToggle
            className={cn("hidden flex-shrink-0 scale-110 md:inline-flex", MKT_TOP_BAR_THEME_TOGGLE)}
          />

          <nav className="ml-2 hidden items-center gap-1.5 md:flex">
            {CLOVE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`rounded-lg px-4 py-2.5 text-base font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <CloveThemeSwitcher className="hidden flex-shrink-0 md:block" />

          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Open cart"
            className="relative hidden h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-zinc-100 transition-colors hover:bg-zinc-800 md:inline-flex"
          >
            <ShoppingBag size={22} />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Open profile"
            className="hidden h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-900 text-zinc-100 transition-colors hover:bg-zinc-800 md:inline-flex"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName ? `${displayName}'s profile` : "Your profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-secondary text-xs font-bold text-muted-foreground">
                {displayName || email ? (
                  profileInitials(displayName, email)
                ) : (
                  <User size={22} />
                )}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="clove-mobile-nav"
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-white/15 text-zinc-100 transition-colors hover:bg-white/10 md:hidden"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden transition-[grid-template-rows] duration-250 ease-out md:hidden",
          mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          id="clove-mobile-nav"
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain border-t border-white/10 bg-black",
            !mobileOpen && "pointer-events-none",
          )}
        >
          <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-6 px-6 py-4">
            <nav className="flex flex-col gap-1" aria-label="Site">
              {CLOVE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onNavigate(tab.id);
                    closeMobile();
                  }}
                  className={`rounded-lg px-4 py-3 text-left text-base font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Account
              </p>
              <button
                type="button"
                onClick={() => {
                  onOpenCart();
                  closeMobile();
                }}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-left text-base font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-zinc-900">
                  <ShoppingBag size={20} />
                  {cartCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  ) : null}
                </span>
                <span>Cart{cartCount > 0 ? ` (${cartCount})` : ""}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenProfile();
                  closeMobile();
                }}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-left text-base font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-900">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName ? `${displayName}'s profile` : "Your profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-secondary text-xs font-bold text-muted-foreground">
                      {displayName || email ? (
                        profileInitials(displayName, email)
                      ) : (
                        <User size={20} />
                      )}
                    </span>
                  )}
                </span>
                <span>{profileLabel}</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Appearance
              </p>
              <div className="flex items-center gap-3 px-1">
                <span className="text-sm font-medium text-zinc-300">Light / dark</span>
                <ThemeIconToggle className={cn("scale-110", MKT_TOP_BAR_THEME_TOGGLE)} />
              </div>
              <CloveThemeSwitcher variant="inline" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
