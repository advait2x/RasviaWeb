import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ThemeIconToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { ArrowLeft, Building2, Loader2, Plus, Save, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASH_PRIMARY_CTA } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RestaurantRow = {
  id: number;
  name: string;
  address: string | null;
  description: string | null;
  image_url: string | null;
  current_wait_time: number | null;
  is_waitlist_open: boolean | null;
  rating: number | null;
  price_range: string | null;
  cuisine_tags: string[] | null;
  lat: number | null;
  long: number | null;
  owner_id: string | null;
  created_at: string | null;
  is_featured: boolean | null;
  is_enabled: boolean | null;
  is_coming_soon: boolean | null;
  waitlist_open: boolean | null;
  stripe_account_id: string | null;
  chain_group_key: string | null;
};

type ProfileOption = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  phone_number: string | null;
};

function emptyForm(): Partial<RestaurantRow> {
  return {
    name: "",
    address: "",
    description: "",
    image_url: "",
    current_wait_time: 0,
    price_range: "$$",
    cuisine_tags: [],
    lat: null,
    long: null,
    owner_id: null,
    is_featured: false,
    is_enabled: true,
    is_coming_soon: false,
    waitlist_open: true,
    stripe_account_id: "",
    chain_group_key: "",
  };
}

/** Match partner portal nav chip (readable in light + dark). */
function portalNavModeTab(active: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold tracking-tight transition-colors sm:px-3 sm:text-sm",
    active
      ? "border-zinc-300/80 bg-zinc-200/90 text-zinc-900 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-100 dark:shadow-none"
      : "border-transparent text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-white/[0.04] dark:hover:text-zinc-300",
  );
}

function portalListRowSelected(active: boolean) {
  return cn(
    "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
    active
      ? "border border-zinc-300/80 bg-zinc-200/85 text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-100"
      : "text-zinc-600 hover:bg-zinc-100/70 dark:text-zinc-300 dark:hover:bg-white/5",
  );
}

const portalPrimaryCtaClass = cn("gap-1.5 font-semibold", DASH_PRIMARY_CTA);

export default function AdminPortalPage() {
  const { session, isAdmin } = useAuth();
  const { resolvedTheme } = useTheme();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Partial<RestaurantRow>>(emptyForm());
  const [cuisineTagsText, setCuisineTagsText] = useState("");
  /** Raw strings so users can type decimals (e.g. "33.") without controlled input stripping the dot */
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");

  const [adminMode, setAdminMode] = useState<"restaurants" | "groups" | "users">("restaurants");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState({ full_name: "", phone_number: "", role: "user" });
  const [userSaving, setUserSaving] = useState(false);
  const [groupEditorMode, setGroupEditorMode] = useState<"create" | "edit" | null>(null);
  const [groupOriginalKey, setGroupOriginalKey] = useState<string | null>(null);
  const [groupEditorName, setGroupEditorName] = useState("");
  const [groupEditorRestaurantIds, setGroupEditorRestaurantIds] = useState<number[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        supabase.from("restaurants").select("*").order("name", { ascending: true }),
        supabase.from("profiles").select("id, email, full_name, role, phone_number").order("email", { ascending: true }),
      ]);
      if (rRes.error) throw rRes.error;
      if (pRes.error) throw pRes.error;
      setRestaurants((rRes.data ?? []) as RestaurantRow[]);
      setProfiles((pRes.data ?? []) as ProfileOption[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load data";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session && isAdmin) void load();
  }, [session, isAdmin, load]);

  const filteredProfiles = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.email?.toLowerCase().includes(q)) ||
        (p.full_name?.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q),
    );
  }, [profiles, userSearch]);

  const chainGroups = useMemo(() => {
    const groups = new Map<string, RestaurantRow[]>();
    for (const r of restaurants) {
      const key = String(r.chain_group_key ?? "").trim();
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }
    return Array.from(groups.entries())
      .map(([key, members]) => ({
        key,
        members: [...members].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [restaurants]);

  useEffect(() => {
    if (!selectedUserId) return;
    const p = profiles.find((x) => x.id === selectedUserId);
    if (p) {
      setUserDraft({
        full_name: p.full_name ?? "",
        phone_number: p.phone_number ?? "",
        role: p.role ?? "user",
      });
    }
  }, [selectedUserId, profiles]);

  async function handleSaveUser() {
    if (!selectedUserId) return;
    setUserSaving(true);
    try {
      const digits = userDraft.phone_number.replace(/\D/g, "").trim();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: userDraft.full_name.trim() || null,
          phone_number: digits || null,
          role: userDraft.role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedUserId);
      if (error) throw error;
      toast.success("Profile saved.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setUserSaving(false);
    }
  }

  const selectedRestaurant = useMemo(
    () => (selectedId !== null && selectedId !== "new" ? restaurants.find((r) => r.id === selectedId) : null),
    [restaurants, selectedId]
  );

  useEffect(() => {
    if (selectedId === "new") {
      setDraft(emptyForm());
      setCuisineTagsText("");
      setLatText("");
      setLngText("");
      return;
    }
    if (selectedRestaurant) {
      setDraft({ ...selectedRestaurant });
      setCuisineTagsText((selectedRestaurant.cuisine_tags ?? []).join(", "));
      setLatText(selectedRestaurant.lat != null ? String(selectedRestaurant.lat) : "");
      setLngText(selectedRestaurant.long != null ? String(selectedRestaurant.long) : "");
    }
  }, [selectedId, selectedRestaurant]);

  const normalizeGroupKey = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-_]/g, "")
      .replace(/\s+/g, "-");

  function openCreateGroupEditor() {
    setGroupEditorMode("create");
    setGroupOriginalKey(null);
    setGroupEditorName("");
    setGroupEditorRestaurantIds([]);
  }

  function openEditGroupEditor(groupKey: string, memberIds: number[]) {
    setGroupEditorMode("edit");
    setGroupOriginalKey(groupKey);
    setGroupEditorName(groupKey);
    setGroupEditorRestaurantIds(memberIds);
  }

  async function handleSaveGroupEditor() {
    const groupKey = normalizeGroupKey(groupEditorName);
    if (!groupKey) {
      toast.error("Group name is required.");
      return;
    }
    if (groupEditorRestaurantIds.length < 2) {
      toast.error("Select at least 2 restaurants.");
      return;
    }
    setGroupSaving(true);
    try {
      if (groupEditorMode === "edit" && groupOriginalKey) {
        const previousMemberIds = restaurants
          .filter((r) => String(r.chain_group_key ?? "").trim() === groupOriginalKey)
          .map((r) => r.id);
        if (previousMemberIds.length > 0) {
          const { error: clearError } = await supabase
            .from("restaurants")
            .update({ chain_group_key: null })
            .in("id", previousMemberIds);
          if (clearError) throw clearError;
        }
      }

      const { error } = await supabase
        .from("restaurants")
        .update({ chain_group_key: groupKey })
        .in("id", groupEditorRestaurantIds);
      if (error) throw error;

      await load();
      setGroupEditorMode(null);
      setGroupOriginalKey(null);
      setGroupEditorName("");
      setGroupEditorRestaurantIds([]);
      toast.success(groupEditorMode === "create" ? "Group created." : "Group updated.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save group.");
    } finally {
      setGroupSaving(false);
    }
  }

  async function handleDeleteGroup(groupKey: string) {
    setGroupSaving(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ chain_group_key: null })
        .eq("chain_group_key", groupKey);
      if (error) throw error;
      await load();
      if (groupOriginalKey === groupKey) {
        setGroupEditorMode(null);
        setGroupOriginalKey(null);
        setGroupEditorName("");
        setGroupEditorRestaurantIds([]);
      }
      toast.success("Group deleted.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not delete group.");
    } finally {
      setGroupSaving(false);
    }
  }

  const profileLabel = (p: ProfileOption) => {
    const bits = [p.full_name?.trim(), p.email?.trim()].filter(Boolean);
    const label = bits.length ? bits.join(" · ") : p.id.slice(0, 8);
    const role = p.role && p.role !== "user" ? ` (${p.role})` : "";
    return `${label}${role}`;
  };

  async function syncRolesAfterOwnerChange(previousOwnerId: string | null, newOwnerId: string | null) {
    if (previousOwnerId && previousOwnerId !== newOwnerId) {
      const { count, error: cErr } = await supabase
        .from("restaurants")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", previousOwnerId);
      if (cErr) console.error(cErr);
      if (count === 0) {
        const { data: prevProfile } = await supabase.from("profiles").select("role").eq("id", previousOwnerId).maybeSingle();
        if (prevProfile?.role === "restaurant_owner") {
          await supabase.from("profiles").update({ role: "user" }).eq("id", previousOwnerId);
        }
      }
    }
    if (newOwnerId) {
      const { data: np } = await supabase.from("profiles").select("role").eq("id", newOwnerId).maybeSingle();
      if (np?.role && np.role !== "admin" && np.role !== "restaurant_owner") {
        await supabase.from("profiles").update({ role: "restaurant_owner" }).eq("id", newOwnerId);
      }
    }
  }

  async function handleSave() {
    if (selectedId === null) return;
    const name = (draft.name ?? "").trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }
    const tags = cuisineTagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const parseCoord = (s: string): number | null => {
      const t = s.trim();
      if (t === "" || t === "-" || t === "." || t === "-.") return null;
      const n = parseFloat(t);
      return Number.isFinite(n) ? n : null;
    };

    const payload = {
      name,
      address: draft.address?.trim() || null,
      description: draft.description?.trim() || null,
      image_url: draft.image_url?.trim() || null,
      current_wait_time: draft.current_wait_time ?? 0,
      price_range: draft.price_range?.trim() || "$$",
      cuisine_tags: tags.length ? tags : null,
      lat: parseCoord(latText),
      long: parseCoord(lngText),
      owner_id: draft.owner_id || null,
      is_featured: Boolean(draft.is_featured),
      is_enabled: draft.is_enabled ?? true,
      is_coming_soon: Boolean(draft.is_coming_soon),
      waitlist_open: draft.waitlist_open !== false,
      stripe_account_id: draft.stripe_account_id?.trim() || null,
      chain_group_key: draft.chain_group_key?.trim() || null,
    };

    setSaving(true);
    try {
      if (selectedId === "new") {
        const { data, error } = await supabase.from("restaurants").insert(payload).select("id").single();
        if (error) throw error;
        await syncRolesAfterOwnerChange(null, payload.owner_id);
        toast.success("Restaurant created.");
        await load();
        if (data?.id) setSelectedId(data.id);
        return;
      }

      const prev = restaurants.find((r) => r.id === selectedId);
      const prevOwner = prev?.owner_id ?? null;
      const { error } = await supabase.from("restaurants").update(payload).eq("id", selectedId);
      if (error) throw error;
      await syncRolesAfterOwnerChange(prevOwner, payload.owner_id);
      toast.success("Restaurant saved.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!session || !isAdmin) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-zinc-100">
      <header className="sticky top-0 z-40 shrink-0 border-b border-white/[0.08] bg-background/95 shadow-[0_1px_0_rgba(0,0,0,0.25)] backdrop-blur-md dark:shadow-[0_1px_0_rgba(0,0,0,0.4)]">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:px-6">
          <a
            href="/partner-portal"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-900 dark:text-zinc-200 dark:hover:text-amber-100"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back
          </a>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-amber-500/90" />
            <h1 className="truncate text-lg font-bold tracking-tight text-foreground">Admin Portal</h1>
          </div>
          <div className="flex items-center justify-end gap-2">
            <ThemeIconToggle
              className={
                resolvedTheme === "light"
                  ? "border-amber-500/45 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-white/15 bg-zinc-900/85"
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hover-red-override border-white/15 bg-zinc-900/80 text-zinc-200 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white dark:bg-zinc-900/80"
              onClick={() => supabase.auth.signOut()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-wrap gap-2 border-b border-white/[0.08] px-4 py-2 sm:px-6">
        <button
          type="button"
          onClick={() => {
            setAdminMode("restaurants");
            setSelectedUserId(null);
          }}
          className={portalNavModeTab(adminMode === "restaurants")}
        >
          <Building2 className="h-4 w-4" />
          Restaurants
        </button>
        <button
          type="button"
          onClick={() => {
            setAdminMode("users");
            setSelectedId(null);
          }}
          className={portalNavModeTab(adminMode === "users")}
        >
          <Users className="h-4 w-4" />
          Users
        </button>
        <button
          type="button"
          onClick={() => {
            setAdminMode("groups");
            setSelectedId(null);
            setSelectedUserId(null);
          }}
          className={portalNavModeTab(adminMode === "groups")}
        >
          <Users className="h-4 w-4" />
          Groups
        </button>
      </div>

      {adminMode === "users" ? (
        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 lg:min-h-[calc(100svh-6rem)] lg:flex-row lg:gap-6">
          <aside className="flex w-full shrink-0 flex-col gap-3 border-b border-white/10 pb-4 lg:w-[320px] lg:border-b-0 lg:border-r lg:border-white/10 lg:pr-4">
            <Input
              placeholder="Search by name, email, or user id…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="border-white/10 bg-zinc-950/80"
            />
            <ScrollArea className="h-[min(50vh,400px)] lg:h-[calc(100svh-12rem)]">
              {loading ? (
                <div className="flex justify-center py-12 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ul className="space-y-0.5 pr-2">
                  {filteredProfiles.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(p.id)}
                        className={portalListRowSelected(selectedUserId === p.id)}
                      >
                        <span className="font-medium">{profileLabel(p)}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-zinc-600">{p.id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </aside>
          <main className="min-w-0 flex-1">
            {!selectedUserId ? (
              <p className="rounded-xl border border-white/10 bg-zinc-900/40 p-8 text-center text-zinc-400">
                Select a user to view and edit profile fields (name, phone, role).
              </p>
            ) : (
              <div className="mx-auto max-w-xl space-y-5 rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
                <h2 className="text-base font-semibold text-white">Edit profile</h2>
                <p className="text-xs text-zinc-500">
                  Changes apply to <code className="rounded bg-black/40 px-1">public.profiles</code> for customer support.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="ufn">Full name</Label>
                  <Input
                    id="ufn"
                    value={userDraft.full_name}
                    onChange={(e) => setUserDraft((d) => ({ ...d, full_name: e.target.value }))}
                    className="border-white/10 bg-zinc-950/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uph">Phone (digits)</Label>
                  <Input
                    id="uph"
                    value={userDraft.phone_number}
                    onChange={(e) => setUserDraft((d) => ({ ...d, phone_number: e.target.value }))}
                    className="border-white/10 bg-zinc-950/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={userDraft.role}
                    onValueChange={(v) => setUserDraft((d) => ({ ...d, role: v }))}
                  >
                    <SelectTrigger className="border-white/10 bg-zinc-950/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="restaurant_owner">restaurant_owner</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  disabled={userSaving}
                  onClick={() => void handleSaveUser()}
                  className={cn("gap-2", DASH_PRIMARY_CTA)}
                >
                  {userSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save profile
                </Button>
              </div>
            )}
          </main>
        </div>
      ) : adminMode === "groups" ? (
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 lg:min-h-[calc(100svh-6rem)] lg:flex-row lg:gap-6">
        <aside className="flex w-full shrink-0 flex-col gap-3 border-b border-white/10 pb-4 lg:w-[360px] lg:border-b-0 lg:border-r lg:border-white/10 lg:pr-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Groups</p>
            <Button type="button" size="sm" onClick={openCreateGroupEditor} className={cn("h-8", portalPrimaryCtaClass)}>
              <Plus className="h-3.5 w-3.5" />
              Create Group
            </Button>
          </div>
          <ScrollArea className="h-[min(55vh,420px)] lg:h-[calc(100svh-12rem)]">
            {chainGroups.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-zinc-900/40 p-4 text-sm text-zinc-500">
                No groups yet.
              </p>
            ) : (
              <ul className="space-y-2 pr-2">
                {chainGroups.map((g) => (
                  <li key={g.key} className="rounded-lg border border-white/10 bg-zinc-900/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-xs text-sky-300">{g.key}</p>
                      <span className="text-[11px] text-zinc-500">{g.members.length} restaurants</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                      {g.members.map((m) => m.name).join(", ")}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-zinc-300/90 bg-zinc-100 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                        onClick={() => openEditGroupEditor(g.key, g.members.map((m) => m.id))}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-red-600/40 bg-red-100 text-sm font-medium text-red-900 hover:bg-red-200/90 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-100 dark:hover:bg-red-500/25"
                        onClick={() => {
                          if (window.confirm(`Delete group "${g.key}"?`)) {
                            void handleDeleteGroup(g.key);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </aside>

        <main className="min-w-0 flex-1">
          {!groupEditorMode ? (
            <p className="rounded-xl border border-white/10 bg-zinc-900/40 p-8 text-center text-zinc-400">
              Select a group to edit, or create a new group.
            </p>
          ) : (
            <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
              <h2 className="text-base font-semibold text-white">
                {groupEditorMode === "create" ? "Create Group" : `Edit Group - ${groupOriginalKey ?? ""}`}
              </h2>
              <div className="space-y-2">
                <Label htmlFor="group_key">Group name / key</Label>
                <Input
                  id="group_key"
                  value={groupEditorName}
                  onChange={(e) => setGroupEditorName(e.target.value)}
                  placeholder="e.g. saravanaa-bhavan"
                  className="border-white/10 bg-zinc-950/80"
                />
              </div>

              <div className="space-y-2">
                <Label>Select restaurants</Label>
                <ScrollArea className="h-[300px] rounded-lg border border-white/10 bg-zinc-950/40 p-2">
                  <ul className="space-y-1 pr-2">
                    {restaurants.map((r) => {
                      const checked = groupEditorRestaurantIds.includes(r.id);
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setGroupEditorRestaurantIds((prev) =>
                                prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id],
                              )
                            }
                            className={portalListRowSelected(checked)}
                          >
                            <span className="font-medium">{r.name}</span>
                            <span className="mt-0.5 block text-xs text-zinc-500">ID {r.id}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={groupSaving}
                  onClick={() => void handleSaveGroupEditor()}
                  className={cn("gap-2", portalPrimaryCtaClass)}
                >
                  {groupSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {groupEditorMode === "create" ? "Create group" : "Save group"} ({groupEditorRestaurantIds.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    setGroupEditorMode(null);
                    setGroupOriginalKey(null);
                    setGroupEditorName("");
                    setGroupEditorRestaurantIds([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
      ) : (
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-0 px-0 pb-10 pt-4 sm:px-4 lg:min-h-[calc(100svh-4.75rem)] lg:flex-row lg:gap-6">
        <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-white/10 bg-zinc-950/60 lg:w-[320px] lg:flex-shrink-0 lg:self-stretch lg:border-b-0 lg:border-r lg:border-white/10">
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 lg:px-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Restaurants</p>
            <Button type="button" size="sm" onClick={() => setSelectedId("new")} className={cn("h-8", portalPrimaryCtaClass)}>
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </div>
          <ScrollArea className="h-[min(40vh,320px)] min-h-0 lg:h-[calc(100svh-12rem)]">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-zinc-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ul className="space-y-0.5 px-2 pb-4">
                {restaurants.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={portalListRowSelected(selectedId === r.id)}
                    >
                      <span className="font-medium">{r.name}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">ID {r.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-8 lg:px-2">
          {selectedId === null && (
            <p className="rounded-xl border border-white/10 bg-zinc-900/40 p-8 text-center text-zinc-400">
              Select a restaurant or create a new one.
            </p>
          )}

          {selectedId !== null && (selectedId === "new" || selectedRestaurant) && (
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
                <h2 className="text-base font-semibold text-white">
                  {selectedId === "new" ? "New restaurant" : `Edit - ${selectedRestaurant?.name ?? ""}`}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Owner is linked here and in <code className="rounded bg-black/40 px-1 text-amber-200/90">profiles.role</code>{" "}
                  when applicable.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={draft.name ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      className="border-white/10 bg-zinc-950/80"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label>Owner (user)</Label>
                    <Select
                      value={draft.owner_id ?? "__none__"}
                      onValueChange={(v) =>
                        setDraft((d) => ({ ...d, owner_id: v === "__none__" ? null : v }))
                      }
                    >
                      <SelectTrigger className="border-white/10 bg-zinc-950/80">
                        <SelectValue placeholder="No owner" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__none__">No owner</SelectItem>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {profileLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={draft.address ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                      className="border-white/10 bg-zinc-950/80"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      rows={3}
                      value={draft.description ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      className="border-white/10 bg-zinc-950/80"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      value={draft.image_url ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                      className="border-white/10 bg-zinc-950/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lat">Latitude</Label>
                    <Input
                      id="lat"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={latText}
                      onChange={(e) => setLatText(e.target.value)}
                      placeholder="e.g. 33.0999"
                      className="border-white/10 bg-zinc-950/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="long">Longitude</Label>
                    <Input
                      id="long"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={lngText}
                      onChange={(e) => setLngText(e.target.value)}
                      placeholder="e.g. -96.9674"
                      className="border-white/10 bg-zinc-950/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wait">Current wait (minutes)</Label>
                    <Input
                      id="wait"
                      type="number"
                      value={draft.current_wait_time ?? 0}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, current_wait_time: Number(e.target.value) || 0 }))
                      }
                      className="border-white/10 bg-zinc-950/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price range</Label>
                    <Input
                      id="price"
                      value={draft.price_range ?? "$$"}
                      onChange={(e) => setDraft((d) => ({ ...d, price_range: e.target.value }))}
                      className="border-white/10 bg-zinc-950/80"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="tags">Cuisine tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={cuisineTagsText}
                      onChange={(e) => setCuisineTagsText(e.target.value)}
                      placeholder="Indian, Biryani, ..."
                      className="border-white/10 bg-zinc-950/80"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="stripe">Stripe account ID</Label>
                    <Input
                      id="stripe"
                      value={draft.stripe_account_id ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, stripe_account_id: e.target.value }))}
                      className="border-white/10 bg-zinc-950/80 font-mono text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2 sm:col-span-2">
                    <Label htmlFor="enabled" className="cursor-pointer">
                      Listed / enabled in app
                    </Label>
                    <Switch
                      id="enabled"
                      checked={draft.is_enabled !== false}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, is_enabled: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2 sm:col-span-2">
                    <Label htmlFor="wl" className="cursor-pointer">
                      Waitlist open
                    </Label>
                    <Switch
                      id="wl"
                      checked={draft.waitlist_open !== false}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, waitlist_open: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2 sm:col-span-2">
                    <Label htmlFor="feat" className="cursor-pointer">
                      Featured
                    </Label>
                    <Switch
                      id="feat"
                      checked={Boolean(draft.is_featured)}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, is_featured: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2 sm:col-span-2">
                    <div className="flex flex-col">
                      <Label htmlFor="coming_soon" className="cursor-pointer">
                        Coming soon
                      </Label>
                      <span className="text-[11px] text-zinc-500">
                        Shows the restaurant in the app with a "Coming soon" badge and disables ordering / waitlist actions.
                      </span>
                    </div>
                    <Switch
                      id="coming_soon"
                      checked={Boolean(draft.is_coming_soon)}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, is_coming_soon: v }))}
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className={cn("gap-2", DASH_PRIMARY_CTA)}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {selectedId === "new" ? "Create restaurant" : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      )}
    </div>
  );
}
