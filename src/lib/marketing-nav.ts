import { useEffect } from "react";

export function getMarketingPathname(): string {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

export function isLandingPage(): boolean {
  return getMarketingPathname() === "/";
}

/** Scroll to a landing section, navigating home first when on another marketing page. */
export function scrollToLandingSection(id: string) {
  if (!isLandingPage()) {
    window.location.href = `/#${id}`;
    return;
  }
  scrollToLandingSectionInPlace(id);
}

export function scrollToLandingSectionInPlace(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const navHeight = document.querySelector("header")?.offsetHeight ?? 88;
  const extra = LANDING_SECTION_SCROLL_EXTRA[id] ?? 0;
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight + extra;
  window.scrollTo({ top, behavior: "smooth" });
}

const LANDING_HASH_SECTIONS = new Set(["pricing", "about"]);

/** Extra scroll offset per section (negative = scroll further, less space above). */
const LANDING_SECTION_SCROLL_EXTRA: Partial<Record<string, number>> = {
  about: -15,
  pricing: -15,
};

/** After navigating to `/#pricing` or `/#about`, scroll once the landing page has painted. */
export function useLandingHashScroll() {
  useEffect(() => {
    const run = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!LANDING_HASH_SECTIONS.has(id)) return;
      scrollToLandingSectionInPlace(id);
    };

    run();
    const raf = requestAnimationFrame(() => requestAnimationFrame(run));
    const delayed = window.setTimeout(run, 150);

    window.addEventListener("hashchange", run);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(delayed);
      window.removeEventListener("hashchange", run);
    };
  }, []);
}
