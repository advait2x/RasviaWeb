import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type WaitlistEntry = {
    id: string;
    name: string;
    party_size: number;
    status: string;
};

export function LiveWaitlist() {
    const { restaurantId } = useAuth();
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);

    useEffect(() => {
        if (!restaurantId) return;

        // 1. Load initial list
        const fetchEntries = async () => {
            const { data } = await supabase
                .from('waitlist_entries')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('status', 'waiting') // Only show active waiting
                .order('created_at', { ascending: true });

            if (data) setEntries(data);
        };

        fetchEntries();

        // 2. Subscribe to REAL-TIME changes
        const channel = supabase
            .channel('waitlist-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for Inserts (New users) and Updates (Status changes)
                    schema: 'public',
                    table: 'waitlist_entries',
                    filter: `restaurant_id=eq.${restaurantId}`,
                },
                () => {
                    // Refresh list on any change (Simple approach)
                    // For optimization, you can append/remove from state directly
                    fetchEntries();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [restaurantId]);

    return (
        <div className="space-y-2">
            {entries.map((entry) => (
                <div key={entry.id} className="p-4 border rounded flex justify-between">
                    <div>
                        <h3 className="font-bold">{entry.name}</h3>
                        <p className="text-sm text-gray-500">Party of {entry.party_size}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{entry.status}</span>
                </div>
            ))}
        </div>
    );
}
