import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; // adjust path
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Clock, Minus, Plus } from "lucide-react";

export function WaitTimeWidget() {
    const { restaurantId } = useAuth();
    const [waitTime, setWaitTime] = useState(0);

    // 1. Fetch initial time
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

    // 2. Update Function (Connected to your UI buttons)
    const updateTime = async (newTime: number) => {
        setWaitTime(newTime); // Optimistic update for UI speed

        console.log(`Attempting to update wait time for Restaurant ID: ${restaurantId} to ${newTime} minutes.`);

        if (!restaurantId) {
            console.error("CRITICAL ERROR: No restaurantId found in context. Cannot update.");
            // Optionally revert the optimistic update here
            // setWaitTime(waitTime); 
            return;
        }

        try {
            const { data, error } = await supabase
                .from('restaurants')
                .update({ current_wait_time: newTime })
                .eq('id', restaurantId)
                .select(); // Adding .select() is helpful to see the returned data

            if (error) {
                console.error("SUPABASE UPDATE FAILED:", error.message, error.details, error.hint);
                // Revert the optimistic update on error
                // setWaitTime(waitTime); 
                alert(`Failed to update: ${error.message}`);
            } else {
                console.log("SUCCESS: Supabase update confirmed.", data);
            }

        } catch (err) {
            console.error("Unexpected error during update:", err);
        }
    };

    if (!restaurantId) {
        // Render an empty placeholder if no restaurantId (or loading) to keep layout stable
        return (
            <div className="flex items-center gap-3 opacity-50">
                <Clock size={18} strokeWidth={1.5} className="text-zinc-500" />
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-zinc-800 border border-white/10" />
                    <div className="flex items-baseline gap-1">
                        <span className="text-[48px] font-bold text-amber-500 tabular-nums leading-none tracking-tight">
                            --
                        </span>
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
                    <span className="text-[48px] font-bold text-amber-500 tabular-nums leading-none tracking-tight">
                        {waitTime}
                    </span>
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
