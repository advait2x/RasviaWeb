import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Permission } from "@/types/dashboard";

type AuthContextType = {
    session: Session | null;
    restaurantId: number | null;
    isAdmin: boolean;
    userRole: string | null;
    permissions: Permission[];
    loading: boolean;
    hasPermission: (perm: Permission) => boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    restaurantId: null,
    isAdmin: false,
    userRole: null,
    permissions: [],
    loading: true,
    hasPermission: () => false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [restaurantId, setRestaurantId] = useState<number | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check active session on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchStaffData(session.user.id);
            else setLoading(false);
        });

        // 2. Listen for login/logout events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
                fetchStaffData(session.user.id);
            } else {
                setRestaurantId(null);
                setIsAdmin(false);
                setUserRole(null);
                setPermissions([]);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchStaffData = async (userId: string) => {
        try {
            // Step 1: Get the staff row with role info
            const { data: staffRow, error: staffError } = await supabase
                .from('restaurant_staff')
                .select('restaurant_id, role, role_id')
                .eq('user_id', userId)
                .single();

            if (staffError) {
                console.error("Error fetching staff data:", staffError.message);
                setLoading(false);
                return;
            }

            if (staffRow) {
                setRestaurantId(staffRow.restaurant_id);

                // Step 2: If role_id exists, fetch role name + permissions from new RBAC tables
                if (staffRow.role_id) {
                    const { data: roleRow, error: roleError } = await supabase
                        .from('restaurant_roles')
                        .select('name, is_owner')
                        .eq('id', staffRow.role_id)
                        .single();

                    if (!roleError && roleRow) {
                        setUserRole(roleRow.name);
                        setIsAdmin(roleRow.is_owner);

                        // Fetch permissions for this role
                        const { data: permRows, error: permError } = await supabase
                            .from('role_permissions')
                            .select('permission')
                            .eq('role_id', staffRow.role_id);

                        if (!permError && permRows) {
                            setPermissions(permRows.map((r) => r.permission as Permission));
                        }
                    }
                } else {
                    // Fallback: legacy role field (pre-migration)
                    const isOwnerLegacy = staffRow.role === 'admin' || staffRow.role === 'owner';
                    setIsAdmin(isOwnerLegacy);
                    setUserRole(staffRow.role);
                    // Legacy users with owner/admin get all permissions
                    if (isOwnerLegacy) {
                        const { ALL_PERMISSIONS } = await import("@/types/dashboard");
                        setPermissions(ALL_PERMISSIONS.map((p) => p.key));
                    }
                }
            }
        } catch (error) {
            console.error("Unexpected error:", error);
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (perm: Permission): boolean => {
        return permissions.includes(perm);
    };

    return (
        <AuthContext.Provider value={{ session, restaurantId, isAdmin, userRole, permissions, loading, hasPermission }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
