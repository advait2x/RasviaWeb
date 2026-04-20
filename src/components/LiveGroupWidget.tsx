import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function LiveGroupWidget({ restaurantId }: { restaurantId: number }) {
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchSessions = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase
            .from('party_sessions')
            .select(`
                id,
                status,
                party_items ( count )
            `)
            .eq('restaurant_id', restaurantId)
            .eq('status', 'open');

        setActiveSessions(data || []);
    }, [restaurantId]);

    const debouncedFetch = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSessions(), 150);
    }, [fetchSessions]);

    useEffect(() => {
        if (!restaurantId) return;

        fetchSessions();

        const channel = supabase
            .channel(`group-widget-${restaurantId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'party_items' },
                () => { debouncedFetch(); }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'party_sessions', filter: `restaurant_id=eq.${restaurantId}` },
                () => { debouncedFetch(); }
            )
            .subscribe();

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            supabase.removeChannel(channel);
        };
    }, [restaurantId, fetchSessions, debouncedFetch]);

    return (
        <div className="card-premium flex h-full flex-col rounded-xl p-6">
            <h3 className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/35 opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400/70" />
                </span>
                Active groups
            </h3>

            {activeSessions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-6 text-zinc-600 text-sm">
                    No active parties at the moment.
                </div>
            ) : (
                <div className="space-y-2.5 overflow-y-auto pr-1">
                    {activeSessions.map((session) => (
                        <div key={session.id} className="flex justify-between items-center p-4 rounded-lg transition-all duration-200 hover:bg-zinc-800/60"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.05)",
                            }}
                        >
                            <div>
                                <p className="text-sm font-medium text-zinc-200">
                                    Party <span className="text-zinc-400">#{session.id.slice(0, 4)}</span>
                                </p>
                                <p className="mt-0.5 text-xs font-medium capitalize text-emerald-200/80">{session.status}</p>
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <span className="text-xl font-semibold tabular-nums text-zinc-100">
                                  {session.party_items[0]?.count || 0}
                                </span>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Items</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
