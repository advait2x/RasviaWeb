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
import {
  CLOVE_ABOUT_SHORT,
  CLOVE_HOME_CATERING_BLURB,
  pathToTab,
  tabToPath,
  type CloveTabId,
} from "@/clove/data";

// ── Per-tab SEO meta (title + description + Open Graph) ─────────────────────
const PAGE_META: Record<CloveTabId, { title: string; description: string }> = {
  home: {
    title: "Clove Dining — Modern Indian Restaurant",
    description: CLOVE_ABOUT_SHORT,
  },
  about: {
    title: "About Us | Clove Dining — Modern Indian Restaurant",
    description:
      "Discover the story behind Clove Dining — a contemporary Indian kitchen where heirloom spice blends meet a refined, seasonal table.",
  },
  menu: {
    title: "Our Menu | Clove Dining — Modern Indian Restaurant",
    description:
      "Explore our menu of handcrafted Indian dishes — from the tandoor to slow-cooked curries and fragrant biryanis, made daily with house-ground spices.",
  },
  catering: {
    title: "Catering | Clove Dining — Modern Indian Restaurant",
    description: CLOVE_HOME_CATERING_BLURB,
  },
  contact: {
    title: "Contact Us | Clove Dining — Modern Indian Restaurant",
    description:
      "Get in touch with Clove Dining for reservations, event inquiries, and catering requests.",
  },
};

function useClovePageMeta(activeTab: CloveTabId) {
  useEffect(() => {
    const { title, description } = PAGE_META[activeTab];

    document.title = title;

    // Upsert <meta name="description">
    let descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descEl) {
      descEl = document.createElement("meta");
      descEl.name = "description";
      document.head.appendChild(descEl);
    }
    descEl.content = description;

    // Upsert Open Graph tags so social crawlers see rich previews
    const ogMeta: Record<string, string> = {
      "og:title": title,
      "og:description": description,
      "og:type": "website",
      "og:site_name": "Clove Dining",
    };
    for (const [property, content] of Object.entries(ogMeta)) {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.content = content;
    }

    return () => {
      document.title = "Rasvia";
      const d = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (d) d.content = "Rasvia - Built for restaurants. Loved by guests.";
    };
  }, [activeTab]);
}

function CloveDiningShell() {
  const { itemCount } = useCloveCart();
  const [activeTab, setActiveTab] = useState<CloveTabId>(() =>
    pathToTab(window.location.pathname),
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useClovePageMeta(activeTab);

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

        <main className="pt-[78px]">
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
