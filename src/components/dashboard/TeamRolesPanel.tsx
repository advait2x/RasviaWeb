import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield, Plus, Pencil, Trash2, Users, UserPlus,
    Check, X, Loader2, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ALL_PERMISSIONS, Permission, RestaurantRole, StaffMember } from "@/types/dashboard";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import PinManagement from "@/components/pos/PinManagement";

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeamRolesPanel() {
    const { restaurantId } = useAuth();

    // ── State ──────────────────────────────────────────────────────────────────
    const [roles, setRoles] = useState<RestaurantRole[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Role editing
    const [editingRole, setEditingRole] = useState<RestaurantRole | null>(null);
    const [roleDraft, setRoleDraft] = useState<{ name: string; permissions: Permission[] }>({ name: "", permissions: [] });
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [roleSaving, setRoleSaving] = useState(false);
    const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);

    // Delete confirmation
    const [deletingRole, setDeletingRole] = useState<RestaurantRole | null>(null);

    // Staff invite
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRoleId, setInviteRoleId] = useState<number | null>(null);
    const [inviting, setInviting] = useState(false);

    // Staff remove
    const [removingStaff, setRemovingStaff] = useState<StaffMember | null>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchRoles = useCallback(async () => {
        if (!restaurantId) return;
        const { data: roleRows, error: roleErr } = await supabase
            .from("restaurant_roles")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("is_owner", { ascending: false })
            .order("name");

        if (roleErr) {
            setError(roleErr.message);
            return;
        }

        // Fetch permissions for each role
        const roleIds = (roleRows ?? []).map((r) => r.id);
        let permRows: { role_id: number; permission: string }[] = [];
        if (roleIds.length > 0) {
            const { data } = await supabase
                .from("role_permissions")
                .select("role_id, permission")
                .in("role_id", roleIds);
            permRows = (data ?? []) as { role_id: number; permission: string }[];
        }

        const mapped: RestaurantRole[] = (roleRows ?? []).map((r) => ({
            id: r.id,
            restaurant_id: r.restaurant_id,
            name: r.name,
            is_owner: r.is_owner,
            permissions: permRows
                .filter((p) => p.role_id === r.id)
                .map((p) => p.permission as Permission),
        }));

        setRoles(mapped);
    }, [restaurantId]);

    const fetchStaff = useCallback(async () => {
        if (!restaurantId) return;
        const { data, error: staffErr } = await supabase
            .from("restaurant_staff")
            .select("id, user_id, role_id, restaurant_id")
            .eq("restaurant_id", restaurantId);

        if (staffErr) {
            console.error("fetchStaff failed:", staffErr.message);
            return;
        }

        // For each staff member, look up their email from auth metadata via the user_id
        // Since we can't access auth.users from the client, we'll show user_id as fallback
        const mapped: StaffMember[] = (data ?? []).map((s) => ({
            id: s.id,
            user_id: s.user_id,
            email: s.user_id, // will try to resolve below
            role_id: s.role_id,
            role_name: "",
            restaurant_id: s.restaurant_id,
        }));

        setStaff(mapped);
    }, [restaurantId]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchRoles(), fetchStaff()]);
            setLoading(false);
        };
        load();
    }, [fetchRoles, fetchStaff]);

    // Resolve role names for staff display
    const getRoleName = (roleId: number | null) => {
        if (!roleId) return "No Role";
        const role = roles.find((r) => r.id === roleId);
        return role?.name ?? "Unknown";
    };

    // ── Role CRUD ──────────────────────────────────────────────────────────────

    const startCreateRole = () => {
        setRoleDraft({ name: "", permissions: [] });
        setEditingRole(null);
        setShowCreateRole(true);
    };

    const startEditRole = (role: RestaurantRole) => {
        setRoleDraft({ name: role.name, permissions: [...role.permissions] });
        setEditingRole(role);
        setShowCreateRole(true);
    };

    const togglePermission = (perm: Permission) => {
        setRoleDraft((d) => ({
            ...d,
            permissions: d.permissions.includes(perm)
                ? d.permissions.filter((p) => p !== perm)
                : [...d.permissions, perm],
        }));
    };

    const handleSaveRole = async () => {
        if (!restaurantId || !roleDraft.name.trim()) return;
        setRoleSaving(true);
        setError(null);

        try {
            let roleId: number;

            if (editingRole) {
                // Update the role name (if not owner)
                if (!editingRole.is_owner) {
                    const { error: updateErr } = await supabase
                        .from("restaurant_roles")
                        .update({ name: roleDraft.name.trim() })
                        .eq("id", editingRole.id);
                    if (updateErr) throw updateErr;
                }
                roleId = editingRole.id;

                // Delete old permissions and insert new ones
                await supabase.from("role_permissions").delete().eq("role_id", roleId);
            } else {
                // Create new role
                const { data: newRole, error: insertErr } = await supabase
                    .from("restaurant_roles")
                    .insert({ restaurant_id: restaurantId, name: roleDraft.name.trim() })
                    .select()
                    .single();
                if (insertErr || !newRole) throw insertErr ?? new Error("Failed to create role");
                roleId = newRole.id;
            }

            // Insert permissions
            if (roleDraft.permissions.length > 0) {
                const permRows = roleDraft.permissions.map((p) => ({
                    role_id: roleId,
                    permission: p,
                }));
                const { error: permErr } = await supabase.from("role_permissions").insert(permRows);
                if (permErr) throw permErr;
            }

            await fetchRoles();
            setShowCreateRole(false);
            setEditingRole(null);
            setSuccess(editingRole ? "Role updated" : "Role created");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to save role");
        } finally {
            setRoleSaving(false);
        }
    };

    const handleDeleteRole = async (role: RestaurantRole) => {
        if (role.is_owner) return;
        setError(null);

        // Check if any staff are using this role
        const staffUsingRole = staff.filter((s) => s.role_id === role.id);
        if (staffUsingRole.length > 0) {
            setError(`Cannot delete "${role.name}" — ${staffUsingRole.length} staff member(s) are assigned to it. Reassign them first.`);
            setDeletingRole(null);
            return;
        }

        try {
            // Permissions cascade-delete via FK
            const { error: deleteErr } = await supabase
                .from("restaurant_roles")
                .delete()
                .eq("id", role.id);
            if (deleteErr) throw deleteErr;

            await fetchRoles();
            setDeletingRole(null);
            setSuccess(`"${role.name}" role deleted`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to delete role");
            setDeletingRole(null);
        }
    };

    // ── Staff management ───────────────────────────────────────────────────────

    const handleInviteStaff = async () => {
        if (!restaurantId || !inviteEmail.trim() || !inviteRoleId) return;
        setInviting(true);
        setError(null);

        try {
            // 1. Resolve the user's UUID from their email via a secure DB function
            //    (auth.users is not directly accessible from the client)
            const { data: userId, error: lookupErr } = await supabase
                .rpc("get_user_id_by_email", { lookup_email: inviteEmail.trim().toLowerCase() });

            if (lookupErr) throw lookupErr;
            if (!userId) {
                throw new Error(`No account found for "${inviteEmail.trim()}". They must sign up first.`);
            }

            // 2. Check if they're already on this restaurant's team
            const { data: existing } = await supabase
                .from("restaurant_staff")
                .select("id")
                .eq("restaurant_id", restaurantId)
                .eq("user_id", userId)
                .maybeSingle();

            if (existing) {
                throw new Error("This user is already a staff member of this restaurant.");
            }

            // 3. Add them to the team with the selected role
            const { error: insertErr } = await supabase.from("restaurant_staff").insert({
                restaurant_id: restaurantId,
                user_id: userId,
                role: "staff",
                role_id: inviteRoleId,
            });

            if (insertErr) throw insertErr;

            await fetchStaff();
            setShowInvite(false);
            setInviteEmail("");
            setInviteRoleId(null);
            setSuccess("Staff member added successfully");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to add staff");
        } finally {
            setInviting(false);
        }
    };


    const handleRemoveStaff = async (s: StaffMember) => {
        setError(null);
        try {
            const { error: deleteErr } = await supabase
                .from("restaurant_staff")
                .delete()
                .eq("id", s.id);
            if (deleteErr) throw deleteErr;

            await fetchStaff();
            setRemovingStaff(null);
            setSuccess("Staff member removed");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to remove staff");
            setRemovingStaff(null);
        }
    };

    const handleUpdateStaffRole = async (staffId: number, newRoleId: number) => {
        setError(null);
        try {
            const { error: updateErr } = await supabase
                .from("restaurant_staff")
                .update({ role_id: newRoleId })
                .eq("id", staffId);
            if (updateErr) throw updateErr;
            await fetchStaff();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update role");
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 size={24} strokeWidth={1.5} className="text-zinc-600 animate-spin" />
            </div>
        );
    }

    const nonOwnerRoles = roles.filter((r) => !r.is_owner);

    return (
        <div className="space-y-6 border-t border-white/5 pt-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                        <Shield size={16} strokeWidth={1.5} className="text-amber-500/70" />
                        Team & Roles
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Create custom roles with specific permissions and assign them to your staff
                    </p>
                </div>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={startCreateRole}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-medium hover:bg-amber-500/15 hover:border-amber-500/40 transition-colors"
                >
                    <Plus size={12} strokeWidth={2} />
                    New Role
                </motion.button>
            </div>

            {/* Status messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400"
                    >
                        <AlertTriangle size={13} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
                            <X size={12} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400"
                    >
                        <Check size={13} strokeWidth={2} />
                        {success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Roles Section ─────────────────────────────────────────────────── */}
            <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={11} strokeWidth={1.5} />
                    Roles ({roles.length})
                </h4>

                {roles.map((role) => {
                    const isExpanded = expandedRoleId === role.id;
                    const staffCount = staff.filter((s) => s.role_id === role.id).length;

                    return (
                        <div
                            key={role.id}
                            className="rounded-xl border border-white/8 bg-zinc-800/40 overflow-hidden transition-all"
                        >
                            {/* Role header */}
                            <button
                                onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                                className="w-full flex items-center px-4 py-3 text-left hover:bg-zinc-800/60 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-zinc-100">{role.name}</span>
                                        {role.is_owner && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                Owner
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-zinc-500">
                                        {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
                                        {" · "}
                                        {staffCount} member{staffCount !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!role.is_owner && (
                                        <>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); startEditRole(role); }}
                                                className="w-7 h-7 rounded-lg bg-zinc-700/50 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                                            >
                                                <Pencil size={12} strokeWidth={1.5} />
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); setDeletingRole(role); }}
                                                className="w-7 h-7 rounded-lg bg-red-500/8 border border-red-500/15 flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                                            >
                                                <Trash2 size={12} strokeWidth={1.5} />
                                            </motion.button>
                                        </>
                                    )}
                                    {role.is_owner && (
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={(e) => { e.stopPropagation(); startEditRole(role); }}
                                            className="w-7 h-7 rounded-lg bg-zinc-700/50 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                                        >
                                            <Pencil size={12} strokeWidth={1.5} />
                                        </motion.button>
                                    )}
                                    {isExpanded ? (
                                        <ChevronUp size={14} className="text-zinc-500" />
                                    ) : (
                                        <ChevronDown size={14} className="text-zinc-500" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded permissions list */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-3 border-t border-white/5 pt-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                {role.permissions.length === 0 ? (
                                                    <span className="text-[11px] text-zinc-600 italic">No permissions assigned</span>
                                                ) : (
                                                    role.permissions.map((perm) => {
                                                        const permInfo = ALL_PERMISSIONS.find((p) => p.key === perm);
                                                        return (
                                                            <span
                                                                key={perm}
                                                                className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-medium text-amber-400"
                                                                title={permInfo?.description}
                                                            >
                                                                {permInfo?.label ?? perm}
                                                            </span>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* ── Staff Section ─────────────────────────────────────────────────── */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={11} strokeWidth={1.5} />
                        Staff Members ({staff.length})
                    </h4>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowInvite(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-[11px] font-medium hover:bg-zinc-700 transition-colors"
                    >
                        <UserPlus size={11} strokeWidth={1.5} />
                        Add Staff
                    </motion.button>
                </div>

                {staff.length === 0 ? (
                    <div className="text-center py-8">
                        <Users size={28} strokeWidth={1} className="text-zinc-700 mx-auto mb-2" />
                        <p className="text-xs text-zinc-600">No staff members yet. Add your first team member above.</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {staff.map((s) => {
                            const role = roles.find((r) => r.id === s.role_id);
                            const isOwner = role?.is_owner ?? false;

                            return (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-zinc-800/40"
                                >
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-lg bg-zinc-700/60 border border-white/8 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-zinc-400 uppercase">
                                            {s.user_id.charAt(0)}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-zinc-200 truncate font-medium">{s.user_id}</p>
                                        <p className="text-[11px] text-zinc-500">{getRoleName(s.role_id)}</p>
                                    </div>

                                    {/* Role selector */}
                                    {!isOwner && (
                                        <select
                                            value={s.role_id ?? ""}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                if (val) handleUpdateStaffRole(s.id, val);
                                            }}
                                            className="h-7 px-2 rounded-lg border border-white/10 bg-zinc-800 text-zinc-300 text-[11px] focus:outline-none focus:border-amber-500/50 cursor-pointer"
                                        >
                                            <option value="" disabled>Select role</option>
                                            {roles.map((r) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Remove button */}
                                    {!isOwner && (
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setRemovingStaff(s)}
                                            className="w-7 h-7 rounded-lg bg-red-500/8 border border-red-500/15 flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/15 transition-colors flex-shrink-0"
                                        >
                                            <Trash2 size={12} strokeWidth={1.5} />
                                        </motion.button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Manager PINs Section ─────────────────────────────────────────── */}
            {staff.length > 0 && (
                <PinManagement staff={staff} roles={roles} />
            )}

            {/* ── Create / Edit Role Dialog ─────────────────────────────────────── */}
            <Dialog open={showCreateRole} onOpenChange={(o) => !o && setShowCreateRole(false)}>
                <DialogContent className="glass-modal max-w-md border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <h3 className="text-base font-semibold text-zinc-100">
                                {editingRole ? `Edit "${editingRole.name}"` : "Create Role"}
                            </h3>
                            <p className="text-xs text-zinc-500">
                                Name the role and select which permissions it should have
                            </p>
                        </div>

                        {/* Role name */}
                        {(!editingRole || !editingRole.is_owner) && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Role Name
                                </label>
                                <Input
                                    value={roleDraft.name}
                                    onChange={(e) => setRoleDraft((d) => ({ ...d, name: e.target.value }))}
                                    placeholder="e.g. FOH, BOH, Manager"
                                    className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                                />
                            </div>
                        )}

                        {/* Permissions toggles */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Permissions
                                </label>
                                <span className="text-[10px] text-zinc-500">
                                    {roleDraft.permissions.length} / {ALL_PERMISSIONS.length} selected
                                </span>
                            </div>
                            <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                                {ALL_PERMISSIONS.map(({ key, label, description }) => {
                                    const checked = roleDraft.permissions.includes(key);
                                    return (
                                        <label
                                            key={key}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${checked
                                                ? "bg-amber-500/8 border-amber-500/25"
                                                : "bg-zinc-800/40 border-white/5 hover:border-white/10"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => togglePermission(key)}
                                                className="w-3.5 h-3.5 rounded accent-amber-500 flex-shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <p className={`text-xs font-medium ${checked ? "text-amber-300" : "text-zinc-300"}`}>
                                                    {label}
                                                </p>
                                                <p className="text-[10px] text-zinc-600 leading-tight">{description}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setShowCreateRole(false); setEditingRole(null); }}
                                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSaveRole}
                                disabled={roleSaving || (!editingRole?.is_owner && !roleDraft.name.trim())}
                                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {roleSaving ? (
                                    <Loader2 size={16} className="animate-spin mx-auto" />
                                ) : editingRole ? "Save Changes" : "Create Role"}
                            </motion.button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Add Staff Dialog ──────────────────────────────────────────────── */}
            <Dialog open={showInvite} onOpenChange={(o) => !o && setShowInvite(false)}>
                <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <h3 className="text-base font-semibold text-zinc-100">Add Staff Member</h3>
                            <p className="text-xs text-zinc-500">
                                Enter the user ID or email of the person you want to add, and select their role
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    User ID / Email
                                </label>
                                <Input
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="user@example.com or UUID"
                                    className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Assign Role
                                </label>
                                <select
                                    value={inviteRoleId ?? ""}
                                    onChange={(e) => setInviteRoleId(Number(e.target.value) || null)}
                                    className="w-full h-10 px-3 rounded-lg border border-white/10 bg-zinc-800/60 text-zinc-100 text-sm focus:outline-none focus:border-amber-500/50 cursor-pointer"
                                >
                                    <option value="">Select a role...</option>
                                    {nonOwnerRoles.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setShowInvite(false); setInviteEmail(""); setInviteRoleId(null); }}
                                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleInviteStaff}
                                disabled={inviting || !inviteEmail.trim() || !inviteRoleId}
                                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {inviting ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Add Staff"}
                            </motion.button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Delete Role Confirmation ──────────────────────────────────────── */}
            <Dialog open={!!deletingRole} onOpenChange={(o) => !o && setDeletingRole(null)}>
                <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <AlertTriangle size={22} strokeWidth={1.5} className="text-red-400" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-base font-semibold text-zinc-100">Delete "{deletingRole?.name}" role?</h3>
                            <p className="text-sm text-zinc-400">
                                This will remove the role and all its permissions. Staff currently assigned to this role will need to be reassigned.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full pt-1">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDeletingRole(null)}
                                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => deletingRole && handleDeleteRole(deletingRole)}
                                className="flex-1 py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-colors"
                            >
                                Delete Role
                            </motion.button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Remove Staff Confirmation ─────────────────────────────────────── */}
            <Dialog open={!!removingStaff} onOpenChange={(o) => !o && setRemovingStaff(null)}>
                <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <AlertTriangle size={22} strokeWidth={1.5} className="text-red-400" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-base font-semibold text-zinc-100">Remove staff member?</h3>
                            <p className="text-sm text-zinc-400">
                                {removingStaff?.user_id} will lose access to this restaurant's dashboard.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full pt-1">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setRemovingStaff(null)}
                                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => removingStaff && handleRemoveStaff(removingStaff)}
                                className="flex-1 py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-colors"
                            >
                                Remove
                            </motion.button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
