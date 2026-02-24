import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // Clear any previous error immediately on success.
            // Keep loading=true so we show the spinner while App.tsx
            // transitions to the dashboard — prevents any error flash.
            setError(null);
        }
    };

    return (
        <div style={styles.root}>
            {/* Animated background layers */}
            <div style={styles.bgBase} />
            <div style={styles.bgGradient1} />
            <div style={styles.bgGradient2} />
            <div style={styles.bgGradient3} />
            <div style={styles.bgNoise} />

            {/* Floating orbs */}
            <div style={styles.orb1} />
            <div style={styles.orb2} />
            <div style={styles.orb3} />

            {/* Grid overlay */}
            <div style={styles.grid} />

            {/* Main content */}
            <div style={styles.contentWrapper}>

                {/* Logo / Brand mark */}
                <div style={styles.logoArea}>
                    <div style={styles.logoRing}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="12" stroke="#F59E0B" strokeWidth="2" fill="none" />
                            <path d="M10 16 C10 12, 16 8, 22 12 C18 14 18 18 22 20 C16 24 10 20 10 16Z" fill="#F59E0B" opacity="0.9" />
                        </svg>
                    </div>
                    <span style={styles.logoText}>rasvia</span>
                </div>

                {/* Glass card */}
                <div style={styles.card}>
                    {/* Top accent bar */}
                    <div style={styles.cardAccentBar} />

                    <div style={styles.cardInner}>
                        <div style={styles.headerGroup}>
                            <h1 style={styles.heading}>Partner Portal</h1>
                            <p style={styles.subheading}>Sign in to manage your restaurant</p>
                        </div>

                        <form onSubmit={handleLogin} style={styles.form}>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Email address</label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputIcon}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M2 4L8 9L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        required
                                        style={styles.input}
                                        placeholder="you@restaurant.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={(e) => {
                                            (e.target.parentElement as HTMLElement).style.borderColor = "rgba(245,158,11,0.7)";
                                            (e.target.parentElement as HTMLElement).style.boxShadow = "0 0 0 3px rgba(245,158,11,0.12), 0 1px 3px rgba(0,0,0,0.4)";
                                        }}
                                        onBlur={(e) => {
                                            (e.target.parentElement as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                                            (e.target.parentElement as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Password</label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputIcon}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <circle cx="8" cy="11" r="1" fill="currentColor" />
                                        </svg>
                                    </span>
                                    <input
                                        type="password"
                                        required
                                        style={styles.input}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={(e) => {
                                            (e.target.parentElement as HTMLElement).style.borderColor = "rgba(245,158,11,0.7)";
                                            (e.target.parentElement as HTMLElement).style.boxShadow = "0 0 0 3px rgba(245,158,11,0.12), 0 1px 3px rgba(0,0,0,0.4)";
                                        }}
                                        onBlur={(e) => {
                                            (e.target.parentElement as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                                            (e.target.parentElement as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
                                        }}
                                    />
                                </div>
                            </div>

                            {error && !loading && (
                                <div style={styles.errorBox}>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                                        <circle cx="7" cy="7" r="6" stroke="#F87171" strokeWidth="1.5" />
                                        <path d="M7 4v3M7 9.5v.5" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    ...styles.signInBtn,
                                    opacity: loading ? 0.7 : 1,
                                    cursor: loading ? "not-allowed" : "pointer",
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #FBBF24 0%, #F59E0B 60%, #D97706 100%)";
                                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 25px rgba(245,158,11,0.45), 0 0 0 1px rgba(245,158,11,0.3)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)";
                                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 15px rgba(245,158,11,0.3), 0 0 0 1px rgba(245,158,11,0.2)";
                                }}
                            >
                                {loading ? (
                                    <span style={styles.btnContent}>
                                        <svg style={styles.spinner} viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
                                        </svg>
                                        Signing in…
                                    </span>
                                ) : (
                                    <span style={styles.btnContent}>
                                        Sign in
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                )}
                            </button>
                        </form>

                        <div style={styles.dividerRow}>
                            <div style={styles.dividerLine} />
                            <span style={styles.dividerText}>Rasvia Partner Network</span>
                            <div style={styles.dividerLine} />
                        </div>

                        <p style={styles.footer}>
                            Don't have an account?{" "}
                            <a href="mailto:partners@rasvia.com" style={styles.footerLink}>
                                Contact us
                            </a>
                        </p>
                    </div>
                </div>

                {/* Bottom tagline */}
                <p style={styles.tagline}>Real-time waitlists. Zero friction. More covers.</p>
            </div>

            <style>{`
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-30px, -40px) scale(1.05); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(40px, 30px) scale(0.95); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(20px, -20px) scale(1.08); }
                    66% { transform: translate(-20px, 10px) scale(0.97); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    root: {
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
    },
    bgBase: {
        position: "absolute",
        inset: 0,
        background: "#09090b",
        zIndex: 0,
    },
    bgGradient1: {
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(120,53,15,0.35) 0%, transparent 60%)",
        zIndex: 1,
    },
    bgGradient2: {
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 50% 50% at 80% 80%, rgba(245,158,11,0.08) 0%, transparent 60%)",
        zIndex: 1,
    },
    bgGradient3: {
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 40% 40% at 10% 60%, rgba(180,83,9,0.12) 0%, transparent 55%)",
        zIndex: 1,
    },
    bgNoise: {
        position: "absolute",
        inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        zIndex: 2,
        opacity: 0.4,
    },
    orb1: {
        position: "absolute",
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
        top: "-15%",
        left: "-10%",
        animation: "float1 12s ease-in-out infinite",
        zIndex: 1,
    },
    orb2: {
        position: "absolute",
        width: 600,
        height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(180,83,9,0.1) 0%, transparent 70%)",
        bottom: "-20%",
        right: "-15%",
        animation: "float2 15s ease-in-out infinite",
        zIndex: 1,
    },
    orb3: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 70%)",
        top: "50%",
        left: "60%",
        animation: "float3 10s ease-in-out infinite",
        zIndex: 1,
    },
    grid: {
        position: "absolute",
        inset: 0,
        backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        zIndex: 2,
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
    },
    contentWrapper: {
        position: "relative",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        width: "100%",
        maxWidth: 440,
        padding: "0 20px",
        animation: "fadeSlideUp 0.6s ease both",
    },
    logoArea: {
        display: "flex",
        alignItems: "center",
        gap: 10,
    },
    logoRing: {
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "rgba(245,158,11,0.1)",
        border: "1px solid rgba(245,158,11,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    logoText: {
        fontSize: 28,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.03em",
    },
    card: {
        width: "100%",
        borderRadius: 20,
        background: "rgba(18,18,20,0.75)",
        border: "1px solid rgba(255,255,255,0.09)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)",
        overflow: "hidden",
    },
    cardAccentBar: {
        height: 3,
        background: "linear-gradient(90deg, transparent 0%, #F59E0B 30%, #FBBF24 50%, #D97706 70%, transparent 100%)",
    },
    cardInner: {
        padding: "32px 36px 36px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
    },
    headerGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    heading: {
        fontSize: 26,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.02em",
        margin: 0,
    },
    subheading: {
        fontSize: 14,
        color: "rgba(255,255,255,0.45)",
        margin: 0,
        fontWeight: 400,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: 500,
        color: "rgba(255,255,255,0.5)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
    },
    inputWrapper: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    },
    inputIcon: {
        position: "absolute",
        left: 14,
        color: "rgba(255,255,255,0.3)",
        display: "flex",
        alignItems: "center",
        pointerEvents: "none",
    },
    input: {
        flex: 1,
        background: "transparent",
        border: "none",
        outline: "none",
        padding: "13px 14px 13px 42px",
        color: "#fff",
        fontSize: 14,
        fontFamily: "'Inter', sans-serif",
        width: "100%",
    },
    errorBox: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 8,
        color: "#FCA5A5",
        fontSize: 13,
        fontWeight: 500,
    },
    signInBtn: {
        width: "100%",
        padding: "14px 20px",
        borderRadius: 10,
        border: "none",
        background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
        color: "#1a0d00",
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: "0.01em",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 15px rgba(245,158,11,0.3), 0 0 0 1px rgba(245,158,11,0.2)",
        marginTop: 4,
    },
    btnContent: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    spinner: {
        width: 16,
        height: 16,
        animation: "spin 0.8s linear infinite",
    },
    dividerRow: {
        display: "flex",
        alignItems: "center",
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        background: "rgba(255,255,255,0.08)",
    },
    dividerText: {
        fontSize: 11,
        color: "rgba(255,255,255,0.25)",
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
    },
    footer: {
        textAlign: "center",
        fontSize: 13,
        color: "rgba(255,255,255,0.35)",
        margin: 0,
    },
    footerLink: {
        color: "#F59E0B",
        textDecoration: "none",
        fontWeight: 500,
    },
    tagline: {
        fontSize: 12,
        color: "rgba(255,255,255,0.2)",
        textAlign: "center",
        letterSpacing: "0.04em",
        margin: 0,
        fontStyle: "italic",
    },
};
