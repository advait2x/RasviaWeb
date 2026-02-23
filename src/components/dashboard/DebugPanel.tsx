import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, Zap, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

const FIRST_NAMES = [
  "James", "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia",
  "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Charlotte", "Alexander",
  "Amelia", "Mason", "Harper", "Ethan", "Evelyn", "Daniel", "Abigail",
  "Michael", "Emily", "Owen", "Elizabeth", "Sebastian", "Ella", "Jack",
  "Scarlett", "Aiden", "Avery", "Leo", "Sofia", "Jackson", "Camila",
  "Mateo", "Aria", "Samuel", "Grace", "David", "Chloe", "Joseph", "Penelope",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson",
  "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
  "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez",
  "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright",
  "Scott", "Torres", "Nguyen", "Hill", "Flores", "Patel", "Kim", "Chen",
  "Nakamura", "O'Brien", "Murphy", "Sullivan", "Walsh", "Burke",
];

// Weighted party sizes: mostly 2-4, some 5-6, occasional 7-8
const PARTY_SIZE_POOL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 6, 6, 7, 8];

const NAME_FORMATS = [
  (f: string, l: string) => `${l}, ${f}`,
  (f: string, l: string) => `${f} ${l}`,
  (_f: string, l: string) => `${l} Family`,
  (_f: string, l: string) => `${l} Party`,
  (f: string, l: string) => `${l}, ${f}`,
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone() {
  const area = randomInt(200, 999);
  const prefix = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `(${area}) ${prefix}-${line}`;
}

function generateEntry() {
  const first = FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)];
  const last = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)];
  const fmt = NAME_FORMATS[randomInt(0, NAME_FORMATS.length - 1)];
  return {
    guestName: fmt(first, last),
    partySize: PARTY_SIZE_POOL[randomInt(0, PARTY_SIZE_POOL.length - 1)],
    phone: randomPhone(),
    minutesAgo: randomInt(1, 10),
  };
}

export default function DebugPanel() {
  const { bulkAddWalkIns, clearAllWaitlist, waitlist } = useDashboard();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [flashing, setFlashing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleGenerate = () => {
    const entries = Array.from({ length: count }, generateEntry);
    bulkAddWalkIns(entries);
    setFlashing(true);
    setTimeout(() => setFlashing(false), 600);
    setOpen(false);
  };

  const clampCount = (val: number) => Math.min(12, Math.max(1, val));

  return (
    <div ref={panelRef} className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((o) => !o)}
        animate={flashing ? { backgroundColor: ["#1a1a2e", "#3b82f620", "#1a1a2e"] } : {}}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
        title="Admin Debug Tools"
      >
        <Bug size={13} strokeWidth={1.5} />
        <span className="text-xs font-medium">Debug</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl z-50 p-4 space-y-4"
          >
            <div>
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-0.5">
                Admin · Debug Tools
              </p>
              <p className="text-xs text-zinc-500">Generate fake waitlist entries</p>
            </div>

            {/* Count input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Number of guests
              </label>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCount((c) => clampCount(c - 1))}
                  className="w-7 h-7 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ChevronDown size={14} strokeWidth={2} />
                </motion.button>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={count}
                  onChange={(e) => setCount(clampCount(parseInt(e.target.value) || 1))}
                  className="flex-1 h-7 rounded-md bg-zinc-800 border border-white/10 text-center text-sm font-semibold text-zinc-100 tabular-nums focus:outline-none focus:border-violet-500/50"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCount((c) => clampCount(c + 1))}
                  className="w-7 h-7 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ChevronUp size={14} strokeWidth={2} />
                </motion.button>
              </div>
              <p className="text-[10px] text-zinc-600 text-center">max 12</p>
            </div>

            {/* Quick-select buttons */}
            <div className="flex gap-1.5">
              {[3, 5, 8, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
                    count === n
                      ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                      : "bg-zinc-800 border border-white/8 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 font-medium text-sm hover:bg-violet-500/25 transition-colors"
            >
              <Zap size={14} strokeWidth={1.5} />
              Generate {count} {count === 1 ? "guest" : "guests"}
            </motion.button>

            {waitingCount > 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={async () => { await clearAllWaitlist(); setOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 font-medium text-sm hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={14} strokeWidth={1.5} />
                Clear All ({waitingCount} waiting)
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
