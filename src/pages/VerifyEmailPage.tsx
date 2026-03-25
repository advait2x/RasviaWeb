import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

type Status = "verifying" | "success" | "error" | "missing";
const WEB_FALLBACK_BASE_URL = "http://192.168.1.96:5173";
const CANONICAL_VERIFY_HOST = new URL(WEB_FALLBACK_BASE_URL).host;

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (window.location.host !== CANONICAL_VERIFY_HOST) {
      const target = `${WEB_FALLBACK_BASE_URL}/verify-email${window.location.search}${window.location.hash}`;
      window.location.replace(target);
      return;
    }

    async function verify() {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const token_hash = params.get("token_hash") || hashParams.get("token_hash");
      const typeRaw = params.get("type") || hashParams.get("type");
      const normalizedType = typeRaw === "signup" ? "email" : typeRaw;
      const type = (normalizedType === "email" || normalizedType === "recovery")
        ? normalizedType
        : null;

      if (!token_hash || !type) {
        setStatus("missing");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({ token_hash, type });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
      } else {
        // Avoid landing users on dashboard access checks after verify.
        await supabase.auth.signOut();
        setStatus("success");
      }
    }

    verify();
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0f0f0f] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12 text-center"
      >
        <p className="text-4xl font-black text-[#FF9933] tracking-tight">rasvia</p>
        <p className="text-sm text-zinc-500 mt-1 tracking-wide">The Path to Flavor.</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-3xl p-10 flex flex-col items-center text-center gap-6"
      >
        {status === "verifying" && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Loader2 size={36} className="text-amber-400 animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Verifying your email…</h1>
              <p className="text-zinc-500 text-sm mt-2">Just a moment while we confirm your account.</p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center"
            >
              <CheckCircle2 size={40} className="text-emerald-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Email Verified! 🎉</h1>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                Your Rasvia account is now active. You can close this tab and open the app.
              </p>
            </div>
            <div className="w-full mt-2 px-5 py-4 rounded-2xl bg-amber-500/8 border border-amber-500/20">
              <p className="text-amber-400 text-sm font-semibold">Open the Rasvia app to get started →</p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle size={40} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Verification Failed</h1>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                {errorMsg || "This link may have expired or already been used."}
              </p>
            </div>
            <p className="text-zinc-600 text-xs">
              Request a new confirmation email from the Rasvia app.
            </p>
          </>
        )}

        {status === "missing" && (
          <>
            <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Mail size={36} className="text-zinc-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Invalid Link</h1>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                This page requires a valid verification link from your email. Please click the link in your Rasvia confirmation email.
              </p>
            </div>
          </>
        )}
      </motion.div>

      <p className="text-zinc-700 text-xs mt-10">© 2025 Rasvia · All rights reserved</p>
    </div>
  );
}
