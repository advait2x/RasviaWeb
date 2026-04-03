import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Check, Loader2, AlertCircle, RotateCcw, Users, Maximize2, Minimize2 } from "lucide-react";

type KioskView = "form" | "success";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const APP_DOWNLOAD_URL = "https://rasvia.com/download";

export default function KioskPage() {
  const { restaurantId } = useAuth();
  const [view, setView] = useState<KioskView>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

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
    if (!restaurantId) {
      setError("Restaurant not linked. Please contact your administrator.");
      return;
    }
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

  const toggleFullscreen = useCallback(() => {
    if (!fullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setFullscreen((f) => !f);
  }, [fullscreen]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!restaurantId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3 p-8">
          <p className="text-xl font-bold text-zinc-100">No Restaurant Linked</p>
          <p className="text-zinc-400 text-sm">
            Your account is not linked to a restaurant yet. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${fullscreen ? "fixed inset-0 z-[9999]" : "h-full w-full"} bg-[#09090b] flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden relative`}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-50 rounded-lg border border-white/10 bg-zinc-800/80 p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
        title={fullscreen ? "Exit fullscreen" : "Enter fullscreen (for iPad kiosk)"}
      >
        {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>

      <AnimatePresence mode="wait">
        {view === "form" ? (
          <FormView
            key="form"
            name={name}
            phone={phone}
            partySize={partySize}
            loading={loading}
            error={error}
            fullscreen={fullscreen}
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
            fullscreen={fullscreen}
            onStartOver={handleStartOver}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface FormViewProps {
  name: string;
  phone: string;
  partySize: number | null;
  loading: boolean;
  error: string | null;
  fullscreen: boolean;
  onNameChange: (v: string) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPartySizeChange: (v: number) => void;
  onSubmit: () => void;
}

function FormView({
  name, phone, partySize, loading, error, fullscreen,
  onNameChange, onPhoneChange, onPartySizeChange, onSubmit,
}: FormViewProps) {
  const isReady = name.trim().length > 0 && phone.replace(/\D/g, "").length >= 10 && partySize !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`w-full px-8 flex flex-col ${fullscreen ? "max-w-2xl py-10 gap-9" : "max-w-xl py-6 gap-5"}`}
    >
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 text-xs font-bold tracking-widest uppercase">Walk-in</span>
        </div>
        <h1 className={`font-black text-zinc-100 tracking-tight leading-none ${fullscreen ? "text-[52px]" : "text-3xl"}`}>
          Join the Waitlist
        </h1>
        <p className={`text-zinc-400 font-medium ${fullscreen ? "text-xl" : "text-sm"}`}>
          Enter your info below and we'll text you when your table is ready.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Your Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Sarah Johnson"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          className={`w-full bg-zinc-900 border-2 border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors duration-200 ${
            fullscreen ? "px-6 py-5 text-[28px] font-semibold rounded-2xl" : "px-4 py-3 text-base font-medium"
          }`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={onPhoneChange}
          placeholder="(555) 000-0000"
          autoComplete="off"
          className={`w-full bg-zinc-900 border-2 border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors duration-200 font-mono tracking-wide ${
            fullscreen ? "px-6 py-5 text-[28px] font-semibold rounded-2xl" : "px-4 py-3 text-base font-medium"
          }`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Party Size</label>
        <div className="grid grid-cols-5 gap-2">
          {PARTY_SIZES.map((size) => (
            <PartySizeButton
              key={size}
              size={size}
              label={String(size)}
              selected={partySize === size}
              fullscreen={fullscreen}
              onClick={() => onPartySizeChange(size)}
            />
          ))}
          <PartySizeButton
            size={11}
            label="10+"
            selected={partySize === 11}
            fullscreen={fullscreen}
            onClick={() => onPartySizeChange(11)}
          />
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
          >
            <AlertCircle size={18} strokeWidth={1.5} className="shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onSubmit}
        disabled={loading}
        className={`w-full rounded-xl font-black tracking-tight transition-all duration-200 flex items-center justify-center gap-3 shadow-xl ${
          fullscreen ? "py-7 text-[28px] rounded-2xl" : "py-4 text-lg"
        } ${
          isReady && !loading
            ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25 cursor-pointer"
            : loading
            ? "bg-amber-500/70 text-black cursor-not-allowed"
            : "bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none"
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={fullscreen ? 28 : 20} className="animate-spin" />
            Adding you to the list...
          </>
        ) : (
          <>
            <Users size={fullscreen ? 28 : 20} strokeWidth={2} />
            Join Waitlist
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

function PartySizeButton({
  size, label, selected, fullscreen, onClick,
}: {
  size: number;
  label: string;
  selected: boolean;
  fullscreen: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`rounded-xl font-black transition-all duration-150 border-2 select-none ${
        fullscreen ? "h-[88px] text-[30px] rounded-2xl" : "h-12 text-lg"
      } ${
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

function SuccessView({
  name,
  phone,
  fullscreen,
  onStartOver,
}: {
  name: string;
  phone: string;
  fullscreen: boolean;
  onStartOver: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`w-full px-8 flex flex-col items-center text-center ${fullscreen ? "max-w-2xl py-10 gap-10" : "max-w-xl py-6 gap-6"}`}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.1 }}
        className={`rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/10 ${
          fullscreen ? "w-36 h-36" : "w-20 h-20"
        }`}
      >
        <Check size={fullscreen ? 72 : 40} strokeWidth={2.5} className="text-emerald-400" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-2"
      >
        <h1 className={`font-black text-zinc-100 tracking-tight leading-tight ${fullscreen ? "text-[46px]" : "text-2xl"}`}>
          You're on the list,{" "}
          <span className="text-amber-400">{name}!</span>
        </h1>
        <p className={`text-zinc-400 font-medium ${fullscreen ? "text-xl" : "text-sm"}`}>
          We'll text you at{" "}
          <span className="text-zinc-200 font-semibold font-mono">{phone}</span>{" "}
          when your table is ready.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className={`flex flex-row items-center w-full rounded-2xl bg-zinc-900/80 border border-white/8 ${
          fullscreen ? "gap-8 p-8 rounded-3xl" : "gap-4 p-5"
        }`}
      >
        <div className={`shrink-0 bg-white rounded-xl shadow-md ${fullscreen ? "p-4 rounded-2xl" : "p-2.5"}`}>
          <QRCode
            value={APP_DOWNLOAD_URL}
            size={fullscreen ? 148 : 88}
            bgColor="#ffffff"
            fgColor="#09090b"
            level="M"
          />
        </div>

        <div className="text-left space-y-1.5">
          <p className={`font-black text-zinc-100 leading-snug ${fullscreen ? "text-2xl" : "text-base"}`}>
            Want to skip the line next time?
          </p>
          <p className={`text-zinc-400 font-medium leading-relaxed ${fullscreen ? "text-base" : "text-xs"}`}>
            Scan to download the{" "}
            <span className="text-amber-400 font-semibold">Rasvia app</span> for{" "}
            <span className="text-amber-400 font-semibold">priority seating</span>{" "}
            and{" "}
            <span className="text-amber-400 font-semibold">exclusive deals</span>.
          </p>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStartOver}
        className={`flex items-center gap-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 hover:border-white/15 text-zinc-300 font-bold transition-colors duration-200 ${
          fullscreen ? "px-12 py-5 text-xl rounded-2xl" : "px-8 py-3 text-sm"
        }`}
      >
        <RotateCcw size={fullscreen ? 22 : 16} strokeWidth={2} />
        Start Over
      </motion.button>
    </motion.div>
  );
}