import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeIconToggle } from "@/components/ThemeToggle";
import {
  MKT_BODY,
  MKT_DISPLAY,
  MKT_FORM_CARD,
  MKT_HEADING,
  MKT_INPUT,
  MKT_LABEL,
  MKT_MUTED,
  mktDashPrimaryClass,
} from "@/lib/marketingUi";
import { cn } from "@/lib/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const prevLock = root.getAttribute("data-theme-lock");
    if (prevLock) root.removeAttribute("data-theme-lock");
    return () => {
      if (prevLock) root.setAttribute("data-theme-lock", prevLock);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (!data.session) {
      setError("No session initialized. Please try again.");
      setLoading(false);
    } else {
      setError(null);
    }
  };

  return (
    <AppShell>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5">
        <div className="absolute right-5 top-5 z-20">
          <ThemeIconToggle />
        </div>

        <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center gap-6 motion-safe:animate-[fadeSlideUp_0.5s_ease_both]">
          <img src="/rasvia-icon.png" alt="Rasvia" className="h-14 w-auto" />

          <div className={cn("w-full", MKT_FORM_CARD)}>
            <div className="flex flex-col gap-6 px-8 pb-8 pt-8 sm:px-9">
              <div className="flex flex-col gap-1.5">
                <h1 className={cn("m-0 text-[26px] leading-tight", MKT_DISPLAY, MKT_HEADING)}>
                  Partner Portal
                </h1>
                <p className={cn("m-0 text-sm", MKT_BODY)}>Sign in to manage your restaurant</p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-email" className={MKT_LABEL}>
                    Email address
                  </label>
                  <div className={cn("relative flex items-center", MKT_INPUT)}>
                    <span className="pointer-events-none absolute left-3.5 flex items-center text-zinc-400 dark:text-zinc-500">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M2 4L8 9L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      className="w-full border-none bg-transparent py-3.5 pl-10 pr-4 text-sm text-zinc-900 outline-none dark:text-zinc-100"
                      placeholder="you@restaurant.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-password" className={MKT_LABEL}>
                    Password
                  </label>
                  <div className={cn("relative flex items-center", MKT_INPUT)}>
                    <span className="pointer-events-none absolute left-3.5 flex items-center text-zinc-400 dark:text-zinc-500">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="8" cy="11" r="1" fill="currentColor" />
                      </svg>
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      className="w-full border-none bg-transparent py-3.5 pl-10 pr-12 text-sm text-zinc-900 outline-none dark:text-zinc-100"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-zinc-400 dark:hover:text-zinc-200"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <path d="M2 8c1.6-2.3 3.5-3.5 6-3.5S12.4 5.7 14 8c-1.6 2.3-3.5 3.5-6 3.5S3.6 10.3 2 8Z" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <path d="M2 8c1.6-2.3 3.5-3.5 6-3.5S12.4 5.7 14 8c-1.6 2.3-3.5 3.5-6 3.5S3.6 10.3 2 8Z" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && !loading && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-800 dark:text-red-300"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-hidden>
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={mktDashPrimaryClass(
                    "mt-1 flex w-full items-center justify-center gap-2 px-5 py-3.5 text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-70",
                  )}
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
                      </svg>
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <p className={cn("m-0 text-center text-[13px]", MKT_BODY)}>
                Don&apos;t have an account?{" "}
                <a href="mailto:support@rasvia.com" className="font-medium text-amber-700 no-underline hover:text-amber-600 dark:text-amber-400">
                  Contact us
                </a>
              </p>
              <a
                href="/"
                className={cn("inline-block text-center text-xs no-underline hover:text-zinc-900 dark:hover:text-white", MKT_MUTED)}
              >
                ← Back to main site
              </a>
            </div>
          </div>

          <p className={cn("m-0 text-center text-xs", MKT_MUTED)}>
            Real-time waitlists. Zero friction. More covers.
          </p>
        </div>

        <style>{`
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .motion-safe\\:animate-\\[fadeSlideUp_0\\.5s_ease_both\\] {
              animation: none !important;
            }
          }
        `}</style>
      </div>
    </AppShell>
  );
}
