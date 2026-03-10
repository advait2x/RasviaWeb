import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import { supabase } from "@/lib/supabase";
import { Check, Loader2, AlertCircle, RotateCcw, Users } from "lucide-react";

type KioskView = "form" | "success";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const APP_DOWNLOAD_URL = "https://rasvia.com/download";

interface KioskPageProps {
  restaurantId: number;
}

export default function KioskPage({ restaurantId }: KioskPageProps) {
  const [view, setView] = useState<KioskView>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState("");

  // Auto-reset after 90s on the success screen so the kiosk is always ready
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (view === "success") {
      resetTimerRef.current = setTimeout(() => handleStartOver(), 90_000);
    }
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [view]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!partySize) {
      setError("Please select your party size.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("waitlist_entries").insert({
      restaurant_id: restaurantId,
      name: `${trimmedName}'s Party`,
      party_leader_name: trimmedName,
      party_size: partySize,
      phone_number: phone,
      status: "waiting",
      source: "walk_in",
    });

    setLoading(false);

    if (insertError) {
      console.error("Kiosk insert error:", insertError.message);
      setError("Something went wrong. Please ask a staff member for help.");
      return;
    }

    setSubmittedName(trimmedName);
    setSubmittedPhone(phone);
    setView("success");
  }, [name, phone, partySize, restaurantId]);

  const handleStartOver = useCallback(() => {
    setName("");
    setPhone("");
    setPartySize(null);
    setError(null);
    setView("form");
  }, []);

  return (
    <div
      className="min-h-screen w-full bg-[#09090b] flex flex-col items-center justify-center overflow-hidden"
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <AnimatePresence mode="wait">
        {view === "form" ? (
          <FormView
            key="form"
            name={name}
            phone={phone}
            partySize={partySize}
            loading={loading}
            error={error}
            onNameChange={(v) => { setName(v); setError(null); }}
            onPhoneChange={handlePhoneChange}
            onPartySizeChange={(v) => { setPartySize(v); setError(null); }}
            onSubmit={handleSubmit}
          />
        ) : (
          <SuccessView
            key="success"
            name={submittedName}
            phone={submittedPhone}
            onStartOver={handleStartOver}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Form View ────────────────────────────────────────────────────────────────

interface FormViewProps {
  name: string;
  phone: string;
  partySize: number | null;
  loading: boolean;
  error: string | null;
  onNameChange: (v: string) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPartySizeChange: (v: number) => void;
  onSubmit: () => void;
}

function FormView({
  name, phone, partySize, loading, error,
  onNameChange, onPhoneChange, onPartySizeChange, onSubmit,
}: FormViewProps) {
  const isReady = name.trim().length > 0 && phone.replace(/\D/g, "").length >= 10 && partySize !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-2xl px-8 py-10 flex flex-col gap-9"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 text-sm font-bold tracking-widest uppercase">Walk-in</span>
        </div>
        <h1 className="text-[52px] font-black text-zinc-100 tracking-tight leading-none">
          Join the Waitlist
        </h1>
        <p className="text-xl text-zinc-400 font-medium">
          Enter your info below and we'll text you when your table is ready.
        </p>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Sarah Johnson"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          className="w-full px-6 py-5 text-[28px] font-semibold bg-zinc-900 border-2 border-zinc-700 rounded-2xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors duration-200"
        />
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
          Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={onPhoneChange}
          placeholder="(555) 000-0000"
          autoComplete="off"
          className="w-full px-6 py-5 text-[28px] font-semibold bg-zinc-900 border-2 border-zinc-700 rounded-2xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors duration-200 font-mono tracking-wide"
        />
      </div>

      {/* Party Size */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
          Party Size
        </label>
        <div className="grid grid-cols-5 gap-3">
          {PARTY_SIZES.map((size) => (
            <PartySizeButton
              key={size}
              size={size}
              label={String(size)}
              selected={partySize === size}
              onClick={() => onPartySizeChange(size)}
            />
          ))}
          <PartySizeButton
            size={11}
            label="10+"
            selected={partySize === 11}
            onClick={() => onPartySizeChange(11)}
          />
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400"
          >
            <AlertCircle size={20} strokeWidth={1.5} className="shrink-0" />
            <span className="text-base font-semibold">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onSubmit}
        disabled={loading}
        className={`w-full py-7 rounded-2xl text-[28px] font-black tracking-tight transition-all duration-200 flex items-center justify-center gap-3 shadow-xl ${
          isReady && !loading
            ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25 cursor-pointer"
            : loading
            ? "bg-amber-500/70 text-black cursor-not-allowed"
            : "bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none"
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={28} className="animate-spin" />
            Adding you to the list…
          </>
        ) : (
          <>
            <Users size={28} strokeWidth={2} />
            Join Waitlist
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

function PartySizeButton({
  size, label, selected, onClick,
}: {
  size: number;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`h-[88px] rounded-2xl text-[30px] font-black transition-all duration-150 border-2 select-none ${
        selected
          ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/30 scale-105"
          : "bg-zinc-900 border-zinc-700 text-zinc-200 active:bg-zinc-800"
      }`}
      aria-label={`Party of ${size}`}
      aria-pressed={selected}
    >
      {label}
    </motion.button>
  );
}

// ─── Success View ─────────────────────────────────────────────────────────────

function SuccessView({
  name,
  phone,
  onStartOver,
}: {
  name: string;
  phone: string;
  onStartOver: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-2xl px-8 py-10 flex flex-col items-center gap-10 text-center"
    >
      {/* Animated Checkmark */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.1 }}
        className="w-36 h-36 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/10"
      >
        <Check size={72} strokeWidth={2.5} className="text-emerald-400" />
      </motion.div>

      {/* Confirmation Text */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-3"
      >
        <h1 className="text-[46px] font-black text-zinc-100 tracking-tight leading-tight">
          You're on the list,{" "}
          <span className="text-amber-400">{name}!</span>
        </h1>
        <p className="text-xl text-zinc-400 font-medium">
          We'll text you at{" "}
          <span className="text-zinc-200 font-semibold font-mono">{phone}</span>{" "}
          when your table is ready.
        </p>
      </motion.div>

      {/* QR Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex flex-row items-center gap-8 w-full p-8 rounded-3xl bg-zinc-900/80 border border-white/8"
      >
        {/* QR Code */}
        <div className="shrink-0 p-4 bg-white rounded-2xl shadow-md">
          <QRCode
            value={APP_DOWNLOAD_URL}
            size={148}
            bgColor="#ffffff"
            fgColor="#09090b"
            level="M"
          />
        </div>

        {/* CTA Text */}
        <div className="text-left space-y-2">
          <p className="text-2xl font-black text-zinc-100 leading-snug">
            Want to skip the line next time?
          </p>
          <p className="text-base text-zinc-400 font-medium leading-relaxed">
            Scan to download the{" "}
            <span className="text-amber-400 font-semibold">Rasvia app</span> for{" "}
            <span className="text-amber-400 font-semibold">priority seating</span>{" "}
            and{" "}
            <span className="text-amber-400 font-semibold">exclusive deals</span>.
          </p>
        </div>
      </motion.div>

      {/* Start Over */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStartOver}
        className="flex items-center gap-3 px-12 py-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 hover:border-white/15 text-zinc-300 text-xl font-bold transition-colors duration-200"
      >
        <RotateCcw size={22} strokeWidth={2} />
        Start Over
      </motion.button>
    </motion.div>
  );
}
