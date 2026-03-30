import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Building2, ChevronLeft, Loader2, Plus, Save, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  waitlist_open: boolean | null;
  stripe_account_id: string | null;
};

type ProfileOption = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
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
    waitlist_open: true,
    stripe_account_id: "",
  };
}

export default function AdminPortalPage() {
  const { session, isAdmin } = useAuth();
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        supabase.from("restaurants").select("*").order("name", { ascending: true }),
        supabase.from("profiles").select("id, email, full_name, role").order("email", { ascending: true }),
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
      is_enabled: draft.is_enabled !== false,
      waitlist_open: draft.waitlist_open !== false,
      stripe_account_id: draft.stripe_account_id?.trim() || null,
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
    <div className="flex min-h-screen flex-col bg-[#09090b] text-zinc-100">
      <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-[#09090b]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-amber-400"
            >
              <ChevronLeft className="h-4 w-4" />
              Site
            </a>
            <a
              href="/partner-portal"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-amber-400"
            >
              <Store className="h-4 w-4" />
              Partner portal
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-500/90" />
            <h1 className="text-lg font-bold tracking-tight text-white">Admin — Restaurants</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/15 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-0 px-0 pb-10 pt-4 sm:px-4 lg:min-h-[calc(100svh-4.75rem)] lg:flex-row lg:gap-6">
        <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-white/10 bg-zinc-950/60 lg:w-[320px] lg:flex-shrink-0 lg:self-stretch lg:border-b-0 lg:border-r lg:border-white/10">
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 lg:px-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Restaurants</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              onClick={() => setSelectedId("new")}
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </div>
          <ScrollArea className="h-[min(40vh,320px)] min-h-0 lg:h-auto lg:flex-1">
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
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedId === r.id
                          ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/30"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
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
                  {selectedId === "new" ? "New restaurant" : `Edit — ${selectedRestaurant?.name ?? ""}`}
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
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="gap-2 bg-amber-600 text-black hover:bg-amber-500"
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
    </div>
  );
}
