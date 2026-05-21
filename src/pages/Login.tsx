import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeIconToggle } from "@/components/ThemeToggle";
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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 font-['Bricolage_Grotesque',sans-serif]">
            <div className="absolute right-5 top-5 z-20">
                <ThemeIconToggle />
            </div>

            <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center gap-6 animate-[fadeSlideUp_0.6s_ease_both]">
                <div className="flex items-center gap-2.5">
                    <img src="/rasvia-icon.png" alt="Rasvia" className="h-[58px] w-auto" />
                </div>

                <div className="w-full overflow-hidden rounded-[20px] border border-zinc-200/90 bg-white/95 shadow-[0_32px_64px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-white/[0.09] dark:bg-[rgba(18,18,20,0.75)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.07)]">
                    <div className="h-[3px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

                    <div className="flex flex-col gap-6 px-9 pb-9 pt-8">
                        <div className="flex flex-col gap-1.5">
                            <h1 className="m-0 text-[26px] font-bold leading-tight tracking-[-0.04em] text-zinc-900 dark:text-white">
                                Partner Portal
                            </h1>
                            <p className="m-0 text-sm font-normal text-zinc-600 dark:text-[#a3a3a3]">
                                Sign in to manage your restaurant
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-[0.05em] text-zinc-500 dark:text-white/50">
                                    Email address
                                </label>
                                <div className="relative flex items-center rounded-[10px] border border-zinc-200 bg-zinc-50 shadow-sm transition-[border-color,box-shadow] focus-within:border-amber-500/70 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] dark:focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12),0_1px_3px_rgba(0,0,0,0.4)]">
                                    <span className="pointer-events-none absolute left-3.5 flex items-center text-zinc-400 dark:text-white/30">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M2 4L8 9L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        required
                                        className="w-full border-none bg-transparent py-3.5 pl-10 pr-10 text-sm text-zinc-900 outline-none dark:text-white"
                                        placeholder="you@restaurant.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-[0.05em] text-zinc-500 dark:text-white/50">
                                    Password
                                </label>
                                <div className="relative flex items-center rounded-[10px] border border-zinc-200 bg-zinc-50 shadow-sm transition-[border-color,box-shadow] focus-within:border-amber-500/70 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] dark:focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.12),0_1px_3px_rgba(0,0,0,0.4)]">
                                    <span className="pointer-events-none absolute left-3.5 flex items-center text-zinc-400 dark:text-white/30">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <circle cx="8" cy="11" r="1" fill="currentColor" />
                                        </svg>
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full border-none bg-transparent py-3.5 pl-10 pr-10 text-sm text-zinc-900 outline-none dark:text-white"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-3 flex h-6 w-6 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-zinc-500 dark:text-white/45"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M2 8c1.6-2.3 3.5-3.5 6-3.5S12.4 5.7 14 8c-1.6 2.3-3.5 3.5-6 3.5S3.6 10.3 2 8Z" stroke="currentColor" strokeWidth="1.5" />
                                                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M2 8c1.6-2.3 3.5-3.5 6-3.5S12.4 5.7 14 8c-1.6 2.3-3.5 3.5-6 3.5S3.6 10.3 2 8Z" stroke="currentColor" strokeWidth="1.5" />
                                                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                                                <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && !loading && (
                                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-700 dark:text-[#FCA5A5]">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                                        <circle cx="7" cy="7" r="6" stroke="#F87171" strokeWidth="1.5" />
                                        <path d="M7 4v3M7 9.5v.5" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "mt-1 flex w-full items-center justify-center gap-2 rounded-[10px] border border-amber-500/50 bg-amber-500/10 px-5 py-3.5 text-[15px] font-bold tracking-[0.01em] text-amber-700 transition-all duration-300 hover:-translate-y-px hover:border-amber-600/80 hover:bg-amber-500/15 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-500/50 dark:bg-amber-500/[0.04] dark:text-amber-500 dark:hover:bg-amber-500/10 dark:hover:shadow-[0_0_20px_rgba(245,158,11,0.25),0_0_40px_rgba(245,158,11,0.1)]",
                                )}
                            >
                                {loading ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
                                        </svg>
                                        Signing in…
                                    </>
                                ) : (
                                    <>
                                        Sign in
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-zinc-200 dark:bg-white/[0.08]" />
                            <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-white/25">
                                Rasvia Partner Network
                            </span>
                            <div className="h-px flex-1 bg-zinc-200 dark:bg-white/[0.08]" />
                        </div>

                        <p className="m-0 text-center text-[13px] text-zinc-500 dark:text-white/35">
                            Don&apos;t have an account?{" "}
                            <a href="mailto:support@rasvia.com" className="font-medium text-amber-600 no-underline dark:text-amber-500">
                                Contact us
                            </a>
                        </p>
                        <a href="/" className="mt-0.5 inline-block text-center text-xs text-zinc-500 no-underline hover:text-zinc-800 dark:text-white/50 dark:hover:text-white/70">
                            ← Back to main site
                        </a>
                    </div>
                </div>

                <p className="m-0 text-center text-xs italic tracking-[0.04em] text-zinc-400 dark:text-white/20">
                    Real-time waitlists. Zero friction. More covers.
                </p>
            </div>

            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
        </AppShell>
    );
}
