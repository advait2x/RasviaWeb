// Public lead capture for the /support free mockup form.
// Sends a formatted notification via Hostinger SMTP to the Rasvia lead inbox list.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import nodemailer from 'npm:nodemailer@6.9.16'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPPORT_EMAIL = 'support@rasvia.com'
const DEFAULT_SMTP_HOST = 'smtp.hostinger.com'
const DEFAULT_SMTP_PORT = 465

/** Default inboxes for every mockup lead (override entirely with MOCKUP_REQUEST_TO_EMAIL). */
const DEFAULT_RECIPIENTS = [
  'support@rasvia.com',
  'rithwik@rasvia.com',
  'advait@rasvia.com',
  'akshaj@rasvia.com',
]

const MOCKUP_TYPE_LABELS: Record<string, string> = {
  website: 'Website mockup',
  app: 'App mockup',
  both: 'Website + app mockup',
}

const MAX_NAME_LEN = 120
const MAX_CUISINE_LEN = 80
const ALLOWED_ORDERING_SETUPS = [
  'Third-party apps (DoorDash, Uber Eats, Grubhub)',
  'Own website or online ordering',
  'POS online ordering (Toast, Square, Clover, etc.)',
  'Phone or in-person only',
  'No online ordering yet',
  'Other',
] as const

const MAX_ORDERING_ITEMS = 6
const MAX_PHONE_LEN = 32
const MAX_EMAIL_LEN = 120

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type JsonObject = Record<string, unknown>

const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false
  bucket.count += 1
  return true
}

function isValidUsPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (normalized.length !== 10) return false
  if (normalized[0] === '0' || normalized[0] === '1') return false
  if (normalized[3] === '0' || normalized[3] === '1') return false
  return true
}

function formatUsPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (normalized.length !== 10) return phone
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`
}

function isValidOrderingItem(item: string): boolean {
  if ((ALLOWED_ORDERING_SETUPS as readonly string[]).includes(item)) return true
  if (item.startsWith('Other — ') && item.length > 'Other — '.length) return true
  return false
}

function parseOrderingSetups(body: JsonObject): string[] {
  const raw = body.ordering_setups
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => asString(entry).slice(0, 120))
      .filter(Boolean)
      .slice(0, MAX_ORDERING_ITEMS)
  }
  const legacy = asString(body.ordering_setup).slice(0, 120)
  return legacy ? [legacy] : []
}

function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value) && value.length <= MAX_EMAIL_LEN
}

function parseRecipients(): string[] {
  const envList = Deno.env.get('MOCKUP_REQUEST_TO_EMAIL')?.trim()
  const raw = envList || DEFAULT_RECIPIENTS.join(',')
  const emails = raw.split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean)
  const valid = emails.filter(isValidEmail)
  return valid.length > 0 ? [...new Set(valid)] : [SUPPORT_EMAIL]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function displayOrDash(value: string): string {
  return value || '—'
}

function emailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:14px 0;border-bottom:1px solid #f4f4f5;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#71717a;">${escapeHtml(label)}</p>
      <p style="margin:0;font-size:16px;font-weight:600;line-height:1.4;color:#18181b;">${escapeHtml(value)}</p>
    </td>
  </tr>`
}

function emailListRow(label: string, items: string[]): string {
  const list = items
    .map(
      (item) =>
        `<li style="margin:0 0 6px;font-size:15px;font-weight:600;line-height:1.4;color:#18181b;">${escapeHtml(item)}</li>`,
    )
    .join('')
  return `<tr>
    <td style="padding:14px 0;border-bottom:1px solid #f4f4f5;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#71717a;">${escapeHtml(label)}</p>
      <ul style="margin:0;padding-left:18px;">${list}</ul>
    </td>
  </tr>`
}

function buildHtmlEmail(fields: {
  restaurantName: string
  cuisine: string
  orderingSetups: string[]
  mockupTypeLabel: string
  email: string
  phone: string
}): string {
  const { restaurantName, cuisine, orderingSetups, mockupTypeLabel, email, phone } = fields
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:Bricolage Grotesque,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#92400e;padding:22px 24px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#f59e0b;">New lead · rasvia.com</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;line-height:1.2;color:#ffffff;">Free mockup request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${emailRow('Restaurant', restaurantName)}
                ${emailRow('Cuisine', cuisine)}
                ${emailRow('Mockup requested', mockupTypeLabel)}
                ${emailListRow('Current ordering setup', orderingSetups)}
                ${emailRow('Email', displayOrDash(email))}
                ${emailRow('Phone', displayOrDash(phone))}
              </table>
              <p style="margin:20px 0 0;padding:12px 14px;border-radius:8px;background:#fafafa;border:1px solid #f59e0b;font-size:13px;line-height:1.5;color:#92400e;">
                <strong>SLA:</strong> Respond within one hour.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#71717a;">Rasvia marketing form · ${escapeHtml(new Date().toISOString())}</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildTextEmail(fields: {
  restaurantName: string
  cuisine: string
  orderingSetups: string[]
  mockupTypeLabel: string
  email: string
  phone: string
}): string {
  const { restaurantName, cuisine, orderingSetups, mockupTypeLabel, email, phone } = fields
  const orderingLines = orderingSetups.map((item) => `  • ${item}`).join('\n')
  return [
    'FREE MOCKUP REQUEST',
    '===================',
    '',
    `Restaurant:              ${restaurantName}`,
    `Cuisine:                 ${cuisine}`,
    `Mockup requested:        ${mockupTypeLabel}`,
    'Current ordering setup:',
    orderingLines,
    `Email:                   ${displayOrDash(email)}`,
    `Phone:                   ${displayOrDash(phone)}`,
    '',
    'Respond within one hour.',
    '',
    `Submitted: ${new Date().toISOString()}`,
    'Source: rasvia.com/support',
  ].join('\n')
}

function smtpConfig() {
  const host = Deno.env.get('SMTP_HOST')?.trim() || DEFAULT_SMTP_HOST
  const portRaw = Deno.env.get('SMTP_PORT')?.trim() || String(DEFAULT_SMTP_PORT)
  const port = Number(portRaw)
  const user = Deno.env.get('SMTP_USER')?.trim() || SUPPORT_EMAIL
  const pass = Deno.env.get('SMTP_PASSWORD')?.trim() ?? ''

  return { host, port, user, pass }
}

async function sendViaHostingerSmtp(payload: {
  to: string[]
  subject: string
  text: string
  html: string
  replyTo?: string
}): Promise<void> {
  const { host, port, user, pass } = smtpConfig()
  if (!pass) {
    throw new Error('server_misconfigured')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...(port === 587 ? { requireTLS: true } : {}),
  })

  try {
    await transporter.sendMail({
      from: `"Rasvia" <${user}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    })
  } catch (err) {
    console.error('[submit-mockup-request] SMTP error:', err instanceof Error ? err.message : err)
    throw new Error('email_send_failed')
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  let body: JsonObject
  try {
    body = (await req.json()) as JsonObject
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const honeypot = asString(body.company_website)
  if (honeypot) {
    return json({ ok: true })
  }

  const restaurantName = asString(body.restaurant_name).slice(0, MAX_NAME_LEN)
  const cuisine = asString(body.cuisine).slice(0, MAX_CUISINE_LEN)
  const orderingSetups = parseOrderingSetups(body)
  const mockupType = asString(body.mockup_type)
  const email = asString(body.email).slice(0, MAX_EMAIL_LEN)
  const phoneRaw = asString(body.phone).slice(0, MAX_PHONE_LEN)
  const phone = phoneRaw && isValidUsPhone(phoneRaw) ? formatUsPhoneDisplay(phoneRaw) : phoneRaw

  if (!restaurantName || !cuisine || orderingSetups.length === 0 || !mockupType) {
    return json({ error: 'missing_fields' }, 400)
  }

  if (!orderingSetups.every(isValidOrderingItem)) {
    return json({ error: 'invalid_ordering_setup' }, 400)
  }

  if (!MOCKUP_TYPE_LABELS[mockupType]) {
    return json({ error: 'invalid_mockup_type' }, 400)
  }

  if (!email && !phoneRaw) {
    return json({ error: 'missing_contact' }, 400)
  }

  if (email && !isValidEmail(email)) {
    return json({ error: 'invalid_email' }, 400)
  }

  if (phoneRaw && !isValidUsPhone(phoneRaw)) {
    return json({ error: 'invalid_phone' }, 400)
  }

  const rateKey = `${clientIp(req)}:mockup`
  if (!checkRateLimit(rateKey)) {
    return json({ error: 'rate_limited' }, 429)
  }

  const recipients = parseRecipients()
  const mockupTypeLabel = MOCKUP_TYPE_LABELS[mockupType]
  const fields = { restaurantName, cuisine, orderingSetups, mockupTypeLabel, email, phone }
  const subject = `Free mockup request — ${restaurantName}`

  try {
    await sendViaHostingerSmtp({
      to: recipients,
      subject,
      text: buildTextEmail(fields),
      html: buildHtmlEmail(fields),
      replyTo: email || undefined,
    })
  } catch (err) {
    const code = err instanceof Error ? err.message : 'email_send_failed'
    if (code === 'server_misconfigured') {
      return json({ error: 'server_misconfigured' }, 500)
    }
    return json({ error: 'email_send_failed' }, 502)
  }

  return json({ ok: true })
})
