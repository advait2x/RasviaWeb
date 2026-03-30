import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Permission, ALL_PERMISSIONS } from "@/types/dashboard";

const ADMIN_RESTAURANT_KEY = "rasvia_admin_active_restaurant_id";

type AuthContextType = {
    session: Session | null;
    /** The restaurant ID currently in scope for all dashboard queries.
     *  - admins: whichever restaurant they've selected in the switcher
     *  - restaurant_owners: their owned restaurant
     *  - staff: their linked restaurant */
    restaurantId: number | null;
    /** Only populated for restaurant_owner role */
    ownedRestaurantId: number | null;
    isAdmin: boolean;
    isRestaurantOwner: boolean;
    userRole: string | null;
    permissions: Permission[];
    loading: boolean;
    hasPermission: (perm: Permission) => boolean;
    /** Admins only: switch the active restaurant */
    setActiveRestaurantId: (id: number) => void;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    restaurantId: null,
    ownedRestaurantId: null,
    isAdmin: false,
    isRestaurantOwner: false,
    userRole: null,
    permissions: [],
    loading: true,
    hasPermission: () => false,
    setActiveRestaurantId: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [restaurantId, setRestaurantId] = useState<number | null>(null);
    const [ownedRestaurantId, setOwnedRestaurantId] = useState<number | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const lastSessionUserIdRef = useRef<string | null>(null);
    /** Prevents overlapping fetchUserData runs from overwriting admin/owner state with a stale staff-only result. */
    const fetchSeqRef = useRef(0);

    useEffect(() => {
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session);
                lastSessionUserIdRef.current = session?.user?.id ?? null;
                if (session) fetchUserData(session.user.id);
                else setLoading(false);
            })
            .catch((error) => {
                console.error("Error reading auth session:", error);
                resetState();
                setLoading(false);
            });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            const incomingUserId = session?.user?.id ?? null;
            const previousUserId = lastSessionUserIdRef.current;
            if (session) {
                // Refetch on sign-in and initial session so `profiles.role` (e.g. admin) is always current.
                // Skip TOKEN_REFRESHED to avoid flashing reload on silent refresh.
                const shouldRefetchUserData =
                    event === "INITIAL_SESSION" ||
                    event === "USER_UPDATED" ||
                    event === "SIGNED_IN";
                if (shouldRefetchUserData) {
                    setLoading(true);
                    fetchUserData(session.user.id);
                }
            } else {
                resetState();
                setLoading(false);
            }
            lastSessionUserIdRef.current = incomingUserId;
        });

        return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resetState = () => {
        setRestaurantId(null);
        setOwnedRestaurantId(null);
        setIsAdmin(false);
        setIsRestaurantOwner(false);
        setUserRole(null);
        setPermissions([]);
    };

    const allPermissionKeys: Permission[] = ALL_PERMISSIONS.map((p) => p.key);

    /** Match Supabase `profiles.role` even if edited with different casing or stray spaces. */
    function normalizePlatformRole(role: string | null | undefined): string {
        return typeof role === "string" ? role.trim().toLowerCase() : "";
    }

    const fetchUserData = async (userId: string) => {
        const seq = ++fetchSeqRef.current;
        try {
            // Step 1: Check the profiles table for platform-level role
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .maybeSingle();

            if (seq !== fetchSeqRef.current) return;

            if (profileError) {
                console.error("Error fetching profile:", profileError.message);
            }

            const platformRole = normalizePlatformRole(profile?.role ?? null);

            if (platformRole === "admin") {
                // Full admin: all permissions, uses restaurant switcher
                setIsAdmin(true);
                setIsRestaurantOwner(false);
                setUserRole("admin");
                setPermissions(allPermissionKeys);
                setOwnedRestaurantId(null);

                // Restore last selected restaurant from localStorage
                const savedId = localStorage.getItem(ADMIN_RESTAURANT_KEY);
                if (savedId) {
                    setRestaurantId(Number(savedId));
                } else {
                    // Pick the first restaurant as default
                    const { data: firstRestaurant } = await supabase
                        .from("restaurants")
                        .select("id")
                        .order("id", { ascending: true })
                        .limit(1)
                        .maybeSingle();
                    if (seq !== fetchSeqRef.current) return;
                    if (firstRestaurant) {
                        setRestaurantId(firstRestaurant.id);
                        localStorage.setItem(ADMIN_RESTAURANT_KEY, String(firstRestaurant.id));
                    }
                }
                return;
            }

            if (platformRole === "restaurant_owner") {
                // Restaurant owner: scoped to their own restaurant
                setIsAdmin(false);
                setIsRestaurantOwner(true);
                setUserRole("restaurant_owner");

                // Fetch their owned restaurant
                const { data: restaurant, error: restError } = await supabase
                    .from("restaurants")
                    .select("id")
                    .eq("owner_id", userId)
                    .limit(1)
                    .maybeSingle();

                if (seq !== fetchSeqRef.current) return;

                if (restError) console.error("Error fetching owned restaurant:", restError.message);

                const ownedId = restaurant?.id ?? null;
                setOwnedRestaurantId(ownedId);
                setRestaurantId(ownedId);

                // Fetch their staff permissions if they have a staff row
                await fetchStaffPermissions(userId, ownedId, seq);
                return;
            }

            // Fall through: no platform role / plain user — check restaurant_staff table
            await fetchStaffData(userId, seq);
        } catch (error) {
            console.error("Unexpected error in fetchUserData:", error);
        } finally {
            if (seq === fetchSeqRef.current) {
                setLoading(false);
            }
        }
    };

    const fetchStaffPermissions = async (userId: string, restaurantId: number | null, seq: number) => {
        if (seq !== fetchSeqRef.current) return;
        if (!restaurantId) {
            // Owner with no restaurant yet — give them all permissions
            setPermissions(allPermissionKeys);
            return;
        }
        const { data: staffRow } = await supabase
            .from("restaurant_staff")
            .select("role, role_id")
            .eq("user_id", userId)
            .eq("restaurant_id", restaurantId)
            .maybeSingle();

        if (seq !== fetchSeqRef.current) return;

        if (staffRow?.role_id) {
            const { data: permRows } = await supabase
                .from("role_permissions")
                .select("permission")
                .eq("role_id", staffRow.role_id);
            if (seq !== fetchSeqRef.current) return;
            if (permRows) {
                setPermissions(permRows.map((r) => r.permission as Permission));
                return;
            }
        }
        // Default: restaurant_owner gets all permissions
        setPermissions(allPermissionKeys);
    };

    const fetchStaffData = async (userId: string, seq: number) => {
        const { data: staffRow, error: staffError } = await supabase
            .from("restaurant_staff")
            .select("restaurant_id, role, role_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

        if (seq !== fetchSeqRef.current) return;

        if (staffError) {
            console.error("Error fetching staff data:", staffError.message);
            // Not a staff member — treat as unprivileged user
            setUserRole("user");
            setPermissions([]);
            setRestaurantId(null);
            setIsAdmin(false);
            setIsRestaurantOwner(false);
            return;
        }

        if (staffRow) {
            setRestaurantId(staffRow.restaurant_id);

            if (staffRow.role_id) {
                const { data: roleRow, error: roleError } = await supabase
                    .from("restaurant_roles")
                    .select("name, is_owner")
                    .eq("id", staffRow.role_id)
                    .limit(1)
                    .maybeSingle();

                if (seq !== fetchSeqRef.current) return;

                if (!roleError && roleRow) {
                    setUserRole(roleRow.name);
                    setIsAdmin(roleRow.is_owner);

                    const { data: permRows, error: permError } = await supabase
                        .from("role_permissions")
                        .select("permission")
                        .eq("role_id", staffRow.role_id);

                    if (seq !== fetchSeqRef.current) return;

                    if (!permError && permRows) {
                        setPermissions(permRows.map((r) => r.permission as Permission));
                    }
                }
            } else {
                const isOwnerLegacy = staffRow.role === "admin" || staffRow.role === "owner";
                setIsAdmin(isOwnerLegacy);
                setUserRole(staffRow.role);
                if (isOwnerLegacy) {
                    setPermissions(allPermissionKeys);
                }
            }
        } else {
            // No staff row: plain customer (profile role user / null or not owner/admin)
            setUserRole("user");
            setPermissions([]);
            setRestaurantId(null);
            setIsAdmin(false);
            setIsRestaurantOwner(false);
        }
    };

    const setActiveRestaurantId = useCallback((id: number) => {
        setRestaurantId(id);
        localStorage.setItem(ADMIN_RESTAURANT_KEY, String(id));
    }, []);

    const hasPermission = (perm: Permission): boolean => {
        return permissions.includes(perm);
    };

    return (
        <AuthContext.Provider value={{
            session,
            restaurantId,
            ownedRestaurantId,
            isAdmin,
            isRestaurantOwner,
            userRole,
            permissions,
            loading,
            hasPermission,
            setActiveRestaurantId,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
