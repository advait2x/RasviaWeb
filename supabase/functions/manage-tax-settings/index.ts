import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "npm:stripe@^13.10.0"
import { createClient } from "npm:@supabase/supabase-js@^2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const US_STATES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
}

type RestaurantRow = {
  id: number
  owner_id: string | null
  stripe_account_id: string | null
  name: string | null
  street_address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  sales_tax_rate_bps: number | null
  stripe_manual_tax_rate_id: string | null
  has_tax_rate_columns?: boolean
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeCountry(value: unknown): string | null {
  const raw = asString(value)
  return raw ? raw.toUpperCase() : null
}

function normalizeStateCode(value: unknown): string | null {
  const raw = asString(value)
  if (!raw) return null
  const normalized = raw.toUpperCase()
  return US_STATES[normalized] ? normalized : null
}

function normalizeTaxRateBps(value: unknown): number | null {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  if (!Number.isFinite(raw)) return null
  const rounded = Math.round(raw)
  if (rounded < 0 || rounded > 10000) return null
  return rounded
}

function formatTaxRatePercent(bps: number | null | undefined): string {
  return ((Number(bps ?? 0) || 0) / 100).toFixed(2)
}

function isMissingRestaurantTaxColumnsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "")
  return (
    message.includes("sales_tax_rate_bps") ||
    message.includes("stripe_manual_tax_rate_id")
  )
}

function isStripeTaxUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase()
  return (
    message.includes("not been activated") ||
    message.includes("tax settings") ||
    message.includes("tax registrations") ||
    message.includes("head office")
  )
}

function formatRegistration(registration: any) {
  return {
    id: registration.id,
    status: registration.status ?? null,
    country: registration.country ?? null,
    state: registration.country_options?.us?.state ?? null,
    type: registration.country_options?.us?.type ?? null,
    active_from: registration.active_from ?? null,
    expires_at: registration.expires_at ?? null,
  }
}

async function stripeApiRequest<T>(
  stripeSecretKey: string,
  path: string,
  init?: RequestInit,
  stripeAccountId?: string | null,
): Promise<T> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      ...(init?.headers ?? {}),
      ...(stripeAccountId ? { "Stripe-Account": stripeAccountId } : {}),
    },
  })

  const payload = await response.json()

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Stripe request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload as T
}

async function listTaxRegistrations(
  stripeSecretKey: string,
  stripeAccountId: string,
  status: "active" | "scheduled",
) {
  const params = new URLSearchParams({
    status,
    limit: "100",
  })

  return await stripeApiRequest<{ data: any[] }>(
    stripeSecretKey,
    `/v1/tax/registrations?${params.toString()}`,
    undefined,
    stripeAccountId,
  )
}

async function createTaxRegistration(
  stripeSecretKey: string,
  stripeAccountId: string,
  stateCode: string,
) {
  const body = new URLSearchParams({
    active_from: "now",
    country: "US",
    "country_options[us][state]": stateCode,
    "country_options[us][type]": "state_sales_tax",
  })

  return await stripeApiRequest(
    stripeSecretKey,
    "/v1/tax/registrations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
    stripeAccountId,
  )
}

async function createManualTaxRate(
  stripeSecretKey: string,
  restaurant: RestaurantRow,
  salesTaxRateBps: number,
) {
  const body = new URLSearchParams({
    display_name: "Sales Tax",
    inclusive: "false",
    percentage: formatTaxRatePercent(salesTaxRateBps),
    country: normalizeCountry(restaurant.country) ?? "US",
    jurisdiction: `${asString(restaurant.city) ?? restaurant.name ?? "Restaurant"}, ${normalizeStateCode(restaurant.state) ?? "US"}`.slice(0, 50),
    "metadata[restaurant_id]": String(restaurant.id),
    "metadata[sales_tax_rate_bps]": String(salesTaxRateBps),
  })

  const stateCode = normalizeStateCode(restaurant.state)
  if (stateCode) {
    body.set("state", stateCode)
  }

  return await stripeApiRequest<{ id: string }>(
    stripeSecretKey,
    "/v1/tax_rates",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  )
}

async function fetchManualTaxRate(
  stripeSecretKey: string,
  taxRateId: string,
) {
  try {
    return await stripeApiRequest<{ id: string; active: boolean; percentage: number }>(
      stripeSecretKey,
      `/v1/tax_rates/${taxRateId}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase()
    if (message.includes("no such tax rate") || message.includes("no such taxrate")) {
      return null
    }
    throw error
  }
}

async function archiveManualTaxRate(
  stripeSecretKey: string,
  taxRateId: string,
) {
  const body = new URLSearchParams({ active: "false" })
  await stripeApiRequest(
    stripeSecretKey,
    `/v1/tax_rates/${taxRateId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  )
}

async function syncManualTaxRate(
  supabase: ReturnType<typeof createClient>,
  stripeSecretKey: string,
  restaurant: RestaurantRow,
  salesTaxRateBps: number,
  replaceExisting = false,
): Promise<string | null> {
  const existingTaxRateId = asString(restaurant.stripe_manual_tax_rate_id)

  if (salesTaxRateBps <= 0) {
    if (existingTaxRateId) {
      try {
        await archiveManualTaxRate(stripeSecretKey, existingTaxRateId)
      } catch (error) {
        console.warn("Failed to archive Stripe tax rate:", error instanceof Error ? error.message : error)
      }
    }

    await supabase
      .from("restaurants")
      .update({ sales_tax_rate_bps: 0, stripe_manual_tax_rate_id: null })
      .eq("id", restaurant.id)

    return null
  }

  if (existingTaxRateId && !replaceExisting) {
    const existingTaxRate = await fetchManualTaxRate(stripeSecretKey, existingTaxRateId)
    if (existingTaxRate && existingTaxRate.active && Number(existingTaxRate.percentage) === Number(formatTaxRatePercent(salesTaxRateBps))) {
      return existingTaxRateId
    }
  }

  if (existingTaxRateId) {
    try {
      await archiveManualTaxRate(stripeSecretKey, existingTaxRateId)
    } catch (error) {
      console.warn("Failed to archive Stripe tax rate:", error instanceof Error ? error.message : error)
    }
  }

  const created = await createManualTaxRate(stripeSecretKey, restaurant, salesTaxRateBps)

  await supabase
    .from("restaurants")
    .update({
      sales_tax_rate_bps: salesTaxRateBps,
      stripe_manual_tax_rate_id: created.id,
    })
    .eq("id", restaurant.id)

  return created.id
}

function restaurantAddressPayload(restaurant: RestaurantRow) {
  return {
    street_address: restaurant.street_address ?? null,
    city: restaurant.city ?? null,
    state: restaurant.state ?? null,
    postal_code: restaurant.postal_code ?? null,
    country: restaurant.country ?? null,
    sales_tax_rate_bps: Number(restaurant.sales_tax_rate_bps ?? 0) || 0,
    stripe_manual_tax_rate_id: restaurant.stripe_manual_tax_rate_id ?? null,
  }
}

async function fetchRestaurant(
  supabase: ReturnType<typeof createClient>,
  restaurantId: number,
): Promise<RestaurantRow | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, owner_id, stripe_account_id, name, street_address, city, state, postal_code, country, sales_tax_rate_bps, stripe_manual_tax_rate_id")
    .eq("id", restaurantId)
    .maybeSingle()

  if (!error) {
    return data ? { ...(data as RestaurantRow), has_tax_rate_columns: true } : null
  }

  if (!isMissingRestaurantTaxColumnsError(error)) throw error

  console.warn("manage-tax-settings fallback: restaurant fixed-tax columns are missing; tax rate editing is unavailable until the migration is applied.")

  const fallback = await supabase
    .from("restaurants")
    .select("id, owner_id, stripe_account_id, name, street_address, city, state, postal_code, country")
    .eq("id", restaurantId)
    .maybeSingle()

  if (fallback.error) throw fallback.error
  if (!fallback.data) return null

  return {
    ...(fallback.data as Omit<RestaurantRow, "sales_tax_rate_bps" | "stripe_manual_tax_rate_id" | "has_tax_rate_columns">),
    sales_tax_rate_bps: 0,
    stripe_manual_tax_rate_id: null,
    has_tax_rate_columns: false,
  }
}

async function authorizeRestaurantAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  restaurant: RestaurantRow,
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error

  const normalizedRole = typeof profile?.role === "string" ? profile.role.trim().toLowerCase() : ""
  const isAdmin = normalizedRole === "admin"
  const isOwner = restaurant.owner_id === userId

  if (!isAdmin && !isOwner) {
    throw new Response(JSON.stringify({ error: "Only restaurant owners or platform admins can manage Stripe Tax." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}

async function buildSnapshot(
  stripe: Stripe,
  stripeSecretKey: string,
  stripeAccountId: string,
  restaurant: RestaurantRow,
) {
  let taxSettings: any = null
  try {
    taxSettings = await stripe.tax.settings.retrieve({}, { stripeAccount: stripeAccountId })
  } catch (error) {
    if (!isStripeTaxUnavailableError(error)) throw error
  }

  const registrations: any[] = []
  for (const status of ["active", "scheduled"] as const) {
    try {
      const response = await listTaxRegistrations(stripeSecretKey, stripeAccountId, status)
      registrations.push(...response.data.map(formatRegistration))
    } catch (error) {
      if (!isStripeTaxUnavailableError(error)) throw error
    }
  }

  return {
    tax_enabled: taxSettings?.status === "active",
    tax_status: taxSettings?.status ?? "pending",
    tax_missing_fields: taxSettings?.status_details?.pending?.missing_fields ?? [],
    defaults: taxSettings?.defaults ?? null,
    head_office_address: taxSettings?.head_office?.address
      ? {
          line1: taxSettings.head_office.address.line1 ?? null,
          city: taxSettings.head_office.address.city ?? null,
          state: taxSettings.head_office.address.state ?? null,
          postal_code: taxSettings.head_office.address.postal_code ?? null,
          country: taxSettings.head_office.address.country ?? null,
        }
      : null,
    registrations,
    restaurant_address: restaurantAddressPayload(restaurant),
    sales_tax_rate_bps: Number(restaurant.sales_tax_rate_bps ?? 0) || 0,
    sales_tax_rate_percent: formatTaxRatePercent(restaurant.sales_tax_rate_bps),
    stripe_manual_tax_rate_id: restaurant.stripe_manual_tax_rate_id ?? null,
    us_states: US_STATES,
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? ""
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return json({ error: "Missing required environment variables." }, 500)
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Unauthorized" }, 401)
  }

  const token = authHeader.slice(7).trim()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401)
  }

  let body: Record<string, unknown> = {}
  if (req.method === "POST") {
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return json({ error: "Invalid JSON body." }, 400)
    }
  }

  const url = new URL(req.url)
  const restaurantId =
    req.method === "GET"
      ? Number(url.searchParams.get("restaurant_id"))
      : Number(body.restaurant_id)

  if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
    return json({ error: "restaurant_id is required" }, 400)
  }

  try {
    const restaurant = await fetchRestaurant(supabase, restaurantId)
    if (!restaurant) {
      return json({ error: "Restaurant not found" }, 404)
    }

    await authorizeRestaurantAccess(supabase, user.id, restaurant)

    const stripeAccountId = asString(restaurant.stripe_account_id)
    if (!stripeAccountId) {
      return json({ error: "Restaurant has no Stripe account. Complete Stripe Connect onboarding first." }, 400)
    }

    if (req.method === "GET") {
      return json(await buildSnapshot(stripe, stripeSecretKey, stripeAccountId, restaurant))
    }

    const action = asString(body.action) ?? "get_snapshot"

    if (action === "get_snapshot") {
      return json(await buildSnapshot(stripe, stripeSecretKey, stripeAccountId, restaurant))
    }

    if (action === "update_head_office") {
      const streetAddress = asString(body.street_address)
      const city = asString(body.city)
      const state = asString(body.state)?.toUpperCase() ?? null
      const postalCode = asString(body.postal_code)
      const country = normalizeCountry(body.country) ?? "US"

      if (!streetAddress || !city || !state || !postalCode || !country) {
        return json({ error: "Street address, city, state, postal code, and country are required." }, 400)
      }

      const addressPayload = {
        street_address: streetAddress,
        city,
        state,
        postal_code: postalCode,
        country,
      }

      const { error: updateError } = await supabase
        .from("restaurants")
        .update(addressPayload)
        .eq("id", restaurantId)

      if (updateError) {
        throw updateError
      }

      await stripe.tax.settings.update(
        {
          head_office: {
            address: {
              line1: streetAddress,
              city,
              state,
              postal_code: postalCode,
              country,
            },
          },
        },
        { stripeAccount: stripeAccountId },
      )

      const refreshedRestaurant = { ...restaurant, ...addressPayload }
      const addressChanged =
        normalizeCountry(restaurant.country) !== country ||
        normalizeStateCode(restaurant.state) !== state ||
        (asString(restaurant.city) ?? "") !== city

      if (restaurant.has_tax_rate_columns !== false && (Number(restaurant.sales_tax_rate_bps ?? 0) || 0) > 0 && (addressChanged || !asString(restaurant.stripe_manual_tax_rate_id))) {
        refreshedRestaurant.stripe_manual_tax_rate_id = await syncManualTaxRate(
          supabase,
          stripeSecretKey,
          refreshedRestaurant,
          Number(restaurant.sales_tax_rate_bps ?? 0) || 0,
          true,
        )
      }

      return json({
        message: "Stripe Tax address saved.",
        ...(await buildSnapshot(stripe, stripeSecretKey, stripeAccountId, refreshedRestaurant)),
      })
    }

    if (action === "update_tax_rate") {
      if (restaurant.has_tax_rate_columns === false) {
        return json({
          error: "Checkout tax rate saving is unavailable until the database migration for restaurant tax settings is applied.",
        }, 400)
      }

      const salesTaxRateBps = normalizeTaxRateBps(body.sales_tax_rate_bps)
      if (salesTaxRateBps === null) {
        return json({ error: "sales_tax_rate_bps must be between 0 and 10000." }, 400)
      }

      const updatedRestaurant: RestaurantRow = {
        ...restaurant,
        sales_tax_rate_bps: salesTaxRateBps,
      }

      updatedRestaurant.stripe_manual_tax_rate_id = await syncManualTaxRate(
        supabase,
        stripeSecretKey,
        updatedRestaurant,
        salesTaxRateBps,
        salesTaxRateBps !== (Number(restaurant.sales_tax_rate_bps ?? 0) || 0) || !asString(restaurant.stripe_manual_tax_rate_id),
      )

      return json({
        message: salesTaxRateBps > 0
          ? `Checkout tax rate saved at ${formatTaxRatePercent(salesTaxRateBps)}%.`
          : "Checkout tax disabled for this restaurant.",
        ...(await buildSnapshot(stripe, stripeSecretKey, stripeAccountId, updatedRestaurant)),
      })
    }

    if (action === "create_registration") {
      const stateCode = normalizeStateCode(body.state)
      if (!stateCode) {
        return json({ error: "A valid US state is required." }, 400)
      }

      const snapshot = await buildSnapshot(stripe, stripeSecretKey, stripeAccountId, restaurant)
      const alreadyRegistered = snapshot.registrations.some(
        (registration: { state: string | null; status: string | null }) =>
          registration.state === stateCode && (registration.status === "active" || registration.status === "scheduled"),
      )

      if (alreadyRegistered) {
        return json({ error: `${stateCode} is already registered for Stripe Tax.` }, 400)
      }

      await createTaxRegistration(stripeSecretKey, stripeAccountId, stateCode)

      return json({
        message: `Stripe Tax registration added for ${stateCode}.`,
        ...(await buildSnapshot(stripe, stripeSecretKey, stripeAccountId, restaurant)),
      })
    }

    return json({ error: "Unsupported action." }, 400)
  } catch (error) {
    if (error instanceof Response) return error

    const message = error instanceof Error ? error.message : "Failed to manage Stripe Tax settings."
    console.error("manage-tax-settings error:", message)
    return json({ error: message }, 400)
  }
})
