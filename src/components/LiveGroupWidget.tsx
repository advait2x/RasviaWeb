import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function LiveGroupWidget({ restaurantId }: { restaurantId: number }) {
    const [activeSessions, setActiveSessions] = useState<any[]>([]);

    useEffect(() => {
        if (!restaurantId) return;

        // 1. Fetch initial open sessions
        const fetchSessions = async () => {
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
        };

        fetchSessions();

        // 2. Listen for NEW items being added anywhere
        const channel = supabase
            .channel('kitchen-display')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'party_items' },
                () => {
                    fetchSessions();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [restaurantId]);

    return (
        <div className="card-premium rounded-xl p-5 flex flex-col h-full">
            <h3 className="text-base font-bold text-zinc-100 mb-4 flex items-center gap-2.5 tracking-tight">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                Active Groups
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
                                <p className="font-semibold text-zinc-200 text-sm">
                                    Party <span className="text-amber-500">#{session.id.slice(0, 4)}</span>
                                </p>
                                <p className="text-xs font-medium text-emerald-400 mt-0.5 capitalize">{session.status}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-2xl font-bold text-zinc-100 tabular-nums">{session.party_items[0]?.count || 0}</span>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Items</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
