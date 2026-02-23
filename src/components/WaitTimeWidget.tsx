import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Clock, Minus, Plus } from "lucide-react";

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
                .from('restaurants')
                .select('current_wait_time')
                .eq('id', restaurantId)
                .single();
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
            .from('restaurants')
            .update({ current_wait_time: clamped })
            .eq('id', restaurantId);
        if (error) console.error("Failed to update wait time:", error.message);
    };

    const commitEdit = () => {
        const parsed = parseInt(inputVal, 10);
        if (!isNaN(parsed)) updateTime(parsed);
        setEditing(false);
    };

    if (!restaurantId) {
        return (
            <div className="flex items-center gap-3 opacity-50">
                <Clock size={18} strokeWidth={1.5} className="text-zinc-500" />
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-zinc-800 border border-white/10" />
                    <div className="flex items-baseline gap-1">
                        <span className="text-[48px] font-bold text-amber-500 tabular-nums leading-none tracking-tight">--</span>
                        <span className="text-sm text-zinc-500 font-medium">min</span>
                    </div>
                    <div className="w-7 h-7 rounded-md bg-zinc-800 border border-white/10" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <Clock size={18} strokeWidth={1.5} className="text-zinc-500" />
            <div className="flex items-center gap-2">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => updateTime(Math.max(0, waitTime - 5))}
                    className="w-7 h-7 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                    <Minus size={14} strokeWidth={1.5} />
                </motion.button>

                <div className="flex items-baseline gap-1">
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
                            className="w-20 text-[48px] font-bold text-amber-500 tabular-nums leading-none tracking-tight bg-transparent border-b-2 border-amber-500/50 focus:outline-none focus:border-amber-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    ) : (
                        <span
                            onClick={() => { setEditing(true); setInputVal(String(waitTime)); }}
                            className="text-[48px] font-bold text-amber-500 tabular-nums leading-none tracking-tight cursor-text hover:text-amber-400 transition-colors select-none"
                            title="Click to edit"
                        >
                            {waitTime}
                        </span>
                    )}
                    <span className="text-sm text-zinc-500 font-medium">min</span>
                </div>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => updateTime(waitTime + 5)}
                    className="w-7 h-7 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                    <Plus size={14} strokeWidth={1.5} />
                </motion.button>
            </div>
        </div>
    );
}
