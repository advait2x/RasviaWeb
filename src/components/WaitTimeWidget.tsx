import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Clock, Minus, Plus } from "lucide-react";

const STEP_MIN = 5;

export function WaitTimeWidget() {
  const { restaurantId } = useAuth();
  const [waitTime, setWaitTime] = useState(0);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!restaurantId) return;
    const fetchTime = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("current_wait_time")
        .eq("id", restaurantId)
        .maybeSingle();
      if (data) setWaitTime(data.current_wait_time);
    };
    fetchTime();
  }, [restaurantId]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const updateTime = async (newTime: number) => {
    const clamped = Math.max(0, Math.round(newTime));
    setWaitTime(clamped);
    if (!restaurantId) return;
    const { error } = await supabase
      .from("restaurants")
      .update({ current_wait_time: clamped })
      .eq("id", restaurantId);
    if (error) console.error("Failed to update wait time:", error.message);
  };

  const commitEdit = () => {
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed)) updateTime(parsed);
    setEditing(false);
  };

  const numberClass =
    "tabular-nums text-3xl font-semibold leading-none tracking-tight text-zinc-100";

  if (!restaurantId) {
    return (
      <div className="flex items-center gap-4 opacity-50">
        <Clock size={18} strokeWidth={1.5} className="shrink-0 text-zinc-500" />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]" />
          <div className="flex items-baseline gap-0">
            <span className={numberClass}>-</span>
            <span className="pl-[3px] text-[11px] font-medium leading-none text-zinc-500">min</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Clock size={18} strokeWidth={1.5} className="shrink-0 text-zinc-500" />
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => updateTime(Math.max(0, waitTime - STEP_MIN))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-zinc-100"
          aria-label={`Decrease quoted wait by ${STEP_MIN} minutes`}
        >
          <Minus size={18} strokeWidth={1.5} />
        </motion.button>

        <div className="flex items-baseline gap-0">
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              min={0}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className={`${numberClass} w-20 border-b border-zinc-500/50 bg-transparent [appearance:textfield] focus:border-zinc-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setInputVal(String(waitTime));
              }}
              className={`${numberClass} cursor-text px-0`}
              title="Click to edit"
            >
              {waitTime}
            </button>
          )}
          <span className="pl-[6px] text-[11px] font-medium leading-none text-zinc-500">min</span>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => updateTime(waitTime + STEP_MIN)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-zinc-100"
          aria-label={`Increase quoted wait by ${STEP_MIN} minutes`}
        >
          <Plus size={18} strokeWidth={1.5} />
        </motion.button>
      </div>
    </div>
  );
}
