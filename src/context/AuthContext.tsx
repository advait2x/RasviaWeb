import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase"; // Ensure this points to your supabase client file
import { Session } from "@supabase/supabase-js";

type AuthContextType = {
    session: Session | null;
    restaurantId: number | null;
    isAdmin: boolean;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, restaurantId: null, isAdmin: false, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [restaurantId, setRestaurantId] = useState<number | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check active session on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchRestaurantId(session.user.id);
            else setLoading(false);
        });

        // 2. Listen for login/logout events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchRestaurantId(session.user.id);
            else {
                setRestaurantId(null);
                setIsAdmin(false);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchRestaurantId = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('restaurant_staff')
                .select('restaurant_id, role')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error("Error fetching restaurant ID:", error.message);
            }

            if (data) {
                setRestaurantId(data.restaurant_id);
                setIsAdmin(data.role === 'admin');
            }
        } catch (error) {
            console.error("Unexpected error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ session, restaurantId, isAdmin, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
