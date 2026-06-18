import { useCallback, useEffect, useState } from "react";
import { CloveAuthProvider } from "@/clove/CloveAuthContext";
import { CloveCartProvider, useCloveCart } from "@/clove/CloveCartContext";
import { CloveNav } from "@/clove/components/CloveNav";
import { CloveFooter } from "@/clove/components/CloveFooter";
import { CartDrawer } from "@/clove/components/CartDrawer";
import { SignInOverlay } from "@/clove/components/SignInOverlay";
import { ProfileOverlay } from "@/clove/components/ProfileOverlay";
import { HomeTab } from "@/clove/tabs/HomeTab";
import { AboutTab } from "@/clove/tabs/AboutTab";
import { MenuTab } from "@/clove/tabs/MenuTab";
import { CateringTab } from "@/clove/tabs/CateringTab";
import { ContactTab } from "@/clove/tabs/ContactTab";
import { pathToTab, tabToPath, type CloveTabId } from "@/clove/data";

function CloveDiningShell() {
  const { itemCount } = useCloveCart();
  const [activeTab, setActiveTab] = useState<CloveTabId>(() =>
    pathToTab(window.location.pathname),
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Keep the active tab in sync with browser back/forward.
  useEffect(() => {
    const onPop = () => setActiveTab(pathToTab(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((tab: CloveTabId) => {
    const path = tabToPath(tab);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="clove-scope min-h-screen bg-background text-foreground">
      <div className="relative z-10">
        <CloveNav
          activeTab={activeTab}
          onNavigate={navigate}
          cartCount={itemCount}
          onOpenCart={() => setCartOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
        />

        <main className="pt-[60px]">
          {activeTab === "home" ? <HomeTab onNavigate={navigate} /> : null}
          {activeTab === "about" ? <AboutTab /> : null}
          {activeTab === "menu" ? <MenuTab /> : null}
          {activeTab === "catering" ? <CateringTab /> : null}
          {activeTab === "contact" ? <ContactTab /> : null}
        </main>

        <CloveFooter onNavigate={navigate} />
      </div>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onRequestSignIn={() => setSignInOpen(true)}
      />
      <ProfileOverlay
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onRequestSignIn={() => setSignInOpen(true)}
      />
      <SignInOverlay open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}

export default function CloveDiningApp() {
  return (
    <CloveAuthProvider>
      <CloveCartProvider>
        <CloveDiningShell />
      </CloveCartProvider>
    </CloveAuthProvider>
  );
}
