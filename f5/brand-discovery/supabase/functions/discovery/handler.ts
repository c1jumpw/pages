// Brand Discovery backend: two routes on one Edge Function.
//   POST .../discovery/upload-url  -> signed URL so the browser can upload a file straight to Storage
//   POST .../discovery/submit      -> saves the answers, then emails the owner and the submitter
//
// All secrets are read from the function's environment. Nothing here is safe to hard-code.

export const BUCKET = 'brand-discovery';
const TABLE = 'brand_discovery_submissions';
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_BODY_CHARS = 200_000;
const LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

const GROUPS = new Set(['logos', 'materials']);
const ALLOWED_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic', 'tif', 'tiff',
  'pdf', 'ai', 'eps', 'psd', 'indd', 'fig', 'sketch',
  'doc', 'docx', 'ppt', 'pptx', 'key', 'pages', 'xls', 'xlsx', 'csv', 'txt', 'rtf',
  'zip', 'mp4', 'mov', 'mp3', 'wav', 'otf', 'ttf', 'woff', 'woff2',
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// deno-lint-ignore no-explicit-any
type Any = any;

export interface Deps {
  // deno-lint-ignore no-explicit-any
  db: Any; // supabase-js client using the service role
  env: (key: string, fallback?: string) => string;
  fetch: typeof fetch;
  now: () => number;
}

/* ---------------- small helpers ---------------- */

const hits = new Map<string, number[]>();
function rateLimited(key: string, max: number, windowMs: number, now: number): boolean {
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// deno-lint-ignore no-control-regex
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(CTRL, '').trim().slice(0, max) : '';
}

export function safeName(name: string): { base: string; ext: string } | null {
  const last = name.split(/[\\/]/).pop() ?? '';
  const dot = last.lastIndexOf('.');
  if (dot < 1) return null;
  const ext = last.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!ALLOWED_EXT.has(ext)) return null;
  const base = last.slice(0, dot).normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80) || 'file';
  return { base, ext };
}

function originOk(req: Request, allowed: string[]): { ok: boolean; origin: string } {
  const origin = req.headers.get('origin') ?? '';
  if (!origin) return { ok: true, origin: '' }; // not a browser (curl, tests); CORS is a browser rule
  return { ok: allowed.includes(origin), origin };
}

function corsHeaders(origin: string): Record<string, string> {
  return origin
    ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    }
    : {};
}

function reply(status: number, body: unknown, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
  });
}

/* ---------------- email ---------------- */

interface Row { section: string; label: string; value: string }
interface FileRef { group: string; name: string; size: number; path: string; url?: string }

function groupRows(rows: Row[]): Array<[string, Row[]]> {
  const out: Array<[string, Row[]]> = [];
  for (const r of rows) {
    let g = out.find((x) => x[0] === r.section);
    if (!g) out.push(g = [r.section, []]);
    g[1].push(r);
  }
  return out;
}

function answersHtml(rows: Row[]): string {
  return groupRows(rows).map(([section, items]) =>
    `<tr><td style="padding:22px 0 6px;font:800 13px/1.3 Arial,sans-serif;color:#0A6DC9;letter-spacing:.02em">${esc(section)}</td></tr>` +
    items.map((r) =>
      `<tr><td style="padding:10px 0;border-top:1px solid #E6E9EC">` +
      `<div style="font:700 12px/1.4 Arial,sans-serif;color:#6B6D6C">${esc(r.label)}</div>` +
      `<div style="font:15px/1.55 Arial,sans-serif;color:#22262A;white-space:pre-wrap">${esc(r.value)}</div></td></tr>`
    ).join('')
  ).join('');
}

function answersText(rows: Row[]): string {
  return groupRows(rows).map(([section, items]) =>
    `${section.toUpperCase()}\n` + items.map((r) => `${r.label}: ${r.value}`).join('\n')
  ).join('\n\n');
}

function shell(siteUrl: string, inner: string, preheader: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:#F1F3F5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F3F5"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#22262A;padding:22px 28px"><img src="${esc(siteUrl)}/assets/logo-light.png" alt="The Fortune 5 Agency" height="30" style="display:block;height:30px;width:auto;border:0;font:800 18px Arial,sans-serif;color:#ffffff"></td></tr>
<tr><td style="padding:28px">${inner}</td></tr>
</table></td></tr></table></body></html>`;
}

function ownerEmail(a: {
  id: string; data: Any; rows: Row[]; files: FileRef[]; siteUrl: string; sentConfirmation: boolean;
}) {
  const d = a.data;
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ');
  const contact: Array<[string, string]> = [
    ['Name', name], ['Role', d.role], ['Business', d.businessName], ['Email', d.email], ['Phone', d.phone],
    ['Website', d.website], ['Location', d.location], ['Prefers', d.contactPref], ['Wants to start', d.timeline],
  ].filter((x) => x[1]) as Array<[string, string]>;
  const contactHtml = contact.map(([k, v]) =>
    `<tr><td style="padding:3px 16px 3px 0;font:700 13px Arial,sans-serif;color:#6B6D6C;white-space:nowrap">${esc(k)}</td>` +
    `<td style="padding:3px 0;font:15px Arial,sans-serif;color:#22262A">${esc(v)}</td></tr>`).join('');
  const filesHtml = a.files.length
    ? `<tr><td style="padding:22px 0 6px;font:800 13px Arial,sans-serif;color:#0A6DC9">Files (links work for 7 days)</td></tr>` +
      a.files.map((f) =>
        `<tr><td style="padding:6px 0;border-top:1px solid #E6E9EC;font:15px Arial,sans-serif">` +
        (f.url ? `<a href="${esc(f.url)}" style="color:#0A6DC9">${esc(f.name)}</a>` : `${esc(f.name)} (link unavailable)`) +
        ` <span style="color:#6B6D6C;font-size:13px">${esc(f.group)}, ${(f.size / 1048576).toFixed(1)} MB</span></td></tr>`).join('')
    : '';
  const html = shell(a.siteUrl, `
    <div style="font:800 22px/1.3 Arial,sans-serif;color:#22262A;margin-bottom:4px">New brand discovery</div>
    <div style="font:15px/1.5 Arial,sans-serif;color:#6B6D6C;margin-bottom:16px">${esc(d.businessName)}. Reply to this email to answer ${esc(d.firstName)} directly.</div>
    <table role="presentation" cellpadding="0" cellspacing="0">${contactHtml}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${answersHtml(a.rows)}${filesHtml}</table>
    <div style="margin-top:24px;font:12px Arial,sans-serif;color:#6B6D6C">Submission ${esc(a.id)}${a.sentConfirmation ? '' : '. Confirmation email was not sent to the submitter.'}</div>`,
    `${d.businessName}: brand discovery from ${name}`);
  const text = [
    `New brand discovery: ${d.businessName}`, '',
    contact.map(([k, v]) => `${k}: ${v}`).join('\n'), '',
    answersText(a.rows),
    a.files.length ? '\nFILES (links work for 7 days)\n' + a.files.map((f) => `${f.name}: ${f.url ?? 'link unavailable'}`).join('\n') : '',
    `\nSubmission ${a.id}`,
  ].join('\n');
  return { subject: `New brand discovery: ${d.businessName} (${name})`, html, text };
}

function confirmationEmail(a: { data: Any; rows: Row[]; siteUrl: string; bookingUrl: string }) {
  const d = a.data;
  const html = shell(a.siteUrl, `
    <div style="font:800 24px/1.25 Arial,sans-serif;color:#22262A;margin-bottom:10px">Thanks, ${esc(d.firstName)}. We’ve got it.</div>
    <div style="font:16px/1.6 Arial,sans-serif;color:#22262A">Your brand discovery for <strong>${esc(d.businessName)}</strong> is in. A specialist will read every answer before we talk, so we can spend the call on strategy instead of basics.</div>
    <div style="margin:24px 0"><a href="${esc(a.bookingUrl)}" style="display:inline-block;background:#22262A;color:#ffffff;font:700 15px Arial,sans-serif;text-decoration:none;padding:14px 22px;border-radius:8px;border-bottom:4px solid #2297F9">Book your free strategy call</a></div>
    <div style="font:14px/1.6 Arial,sans-serif;color:#6B6D6C">Free 30-minute call. No commitment required. Just reply to this email if you have questions.</div>
    <div style="margin-top:26px;font:800 15px Arial,sans-serif;color:#22262A;border-top:2px solid #22262A;padding-top:16px">A copy of your answers</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${answersHtml(a.rows)}</table>`,
    `We received your brand discovery. Here is what happens next.`);
  const text = [
    `Thanks, ${d.firstName}. We've got it.`, '',
    `Your brand discovery for ${d.businessName} is in. A specialist will read every answer before we talk.`,
    `Book your free strategy call: ${a.bookingUrl}`, '',
    'A copy of your answers', '', answersText(a.rows),
  ].join('\n');
  return { subject: `We got your brand discovery, ${d.firstName}`, html, text };
}

async function sendEmail(deps: Deps, msg: {
  to: string; subject: string; html: string; text: string; replyTo?: string; key: string;
}): Promise<string | null> {
  const apiKey = deps.env('RESEND_API_KEY');
  const from = deps.env('FROM_EMAIL');
  if (!apiKey || !from) return 'Resend is not configured (RESEND_API_KEY / FROM_EMAIL).';
  try {
    const res = await deps.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': msg.key,
      },
      body: JSON.stringify({
        from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    if (res.ok) return null;
    return `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
  } catch (e) {
    return `Resend request failed: ${(e as Error).message}`;
  }
}

/* ---------------- routes ---------------- */

async function uploadUrl(deps: Deps, body: Any, ip: string, origin: string): Promise<Response> {
  if (rateLimited(`up:${ip}`, 60, 10 * 60_000, deps.now())) {
    return reply(429, { error: 'Too many uploads. Please wait a few minutes.' }, origin);
  }
  const folder = clean(body?.folder, 64);
  const group = clean(body?.group, 20);
  const size = Number(body?.size);
  const name = safeName(clean(body?.name, 300));
  if (!UUID_RE.test(folder) || !GROUPS.has(group)) return reply(400, { error: 'Bad upload request.' }, origin);
  if (!name) return reply(400, { error: 'That file type isn’t supported.' }, origin);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return reply(400, { error: 'Files can be up to 25 MB.' }, origin);

  const rand = crypto.randomUUID().slice(0, 8);
  const path = `${folder}/${group}/${rand}-${name.base}.${name.ext}`;
  const { data, error } = await deps.db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    console.error('createSignedUploadUrl failed', error?.message);
    return reply(500, { error: 'Upload isn’t available right now. Try again in a moment.' }, origin);
  }
  return reply(200, { uploadUrl: data.signedUrl, path }, origin);
}

function readRows(input: unknown): Row[] {
  if (!Array.isArray(input)) return [];
  const rows: Row[] = [];
  for (const r of input.slice(0, 80)) {
    const row = { section: clean(r?.section, 80), label: clean(r?.label, 120), value: clean(r?.value, 4000) };
    if (row.section && row.label && row.value) rows.push(row);
  }
  return rows;
}

async function submit(deps: Deps, body: Any, ip: string, origin: string): Promise<Response> {
  // Bots tend to fill the hidden field. Say thanks and drop it.
  if (typeof body?.hp === 'string' && body.hp.trim()) return reply(200, { ok: true }, origin);
  if (rateLimited(`sub:${ip}`, 8, 60 * 60_000, deps.now())) {
    return reply(429, { error: 'Too many submissions from this network. Please try again later.' }, origin);
  }

  const folder = clean(body?.folder, 64);
  const raw = body?.data && typeof body.data === 'object' ? body.data : null;
  if (!UUID_RE.test(folder) || !raw) return reply(400, { error: 'That submission looked incomplete.' }, origin);
  if (JSON.stringify(raw).length > 100_000) return reply(413, { error: 'That submission is too large.' }, origin);

  const d = { ...raw, firstName: clean(raw.firstName, 80), lastName: clean(raw.lastName, 80),
    businessName: clean(raw.businessName, 160), email: clean(raw.email, 200).toLowerCase(),
    phone: clean(raw.phone, 40), website: clean(raw.website, 200), location: clean(raw.location, 120),
    role: clean(raw.role, 80), contactPref: clean(raw.contactPref, 80), timeline: clean(raw.timeline, 80) };
  if (!d.firstName) return reply(400, { error: 'Please add your first name.' }, origin);
  if (!d.businessName) return reply(400, { error: 'Please add your business name.' }, origin);
  if (!EMAIL_RE.test(d.email)) return reply(400, { error: 'Please check your email address.' }, origin);
  if (raw.consent !== true) return reply(400, { error: 'Please tick the box so we can contact you.' }, origin);

  const rows = readRows(body.summary);
  const files: FileRef[] = (Array.isArray(body.files) ? body.files : []).slice(0, 20)
    .map((f: Any) => ({ group: clean(f?.group, 20), name: clean(f?.name, 200), size: Number(f?.size) || 0, path: clean(f?.path, 400) }))
    .filter((f: FileRef) => GROUPS.has(f.group) && f.path.startsWith(`${folder}/${f.group}/`) && !f.path.includes('..'));

  // Cheap guards against someone using the confirmation email as a spam cannon.
  const since = new Date(deps.now() - 24 * 3600_000).toISOString();
  const { count: recentSame } = await deps.db.from(TABLE).select('id', { count: 'exact', head: true })
    .eq('email', d.email).gte('created_at', since);
  const { count: recentAll } = await deps.db.from(TABLE).select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(deps.now() - 3600_000).toISOString());
  if ((recentAll ?? 0) >= 100) return reply(429, { error: 'We’re getting a lot of traffic. Please try again shortly.' }, origin);
  const sendConfirmation = (recentSame ?? 0) < 3;

  const meta = { ...(typeof body.meta === 'object' && body.meta ? body.meta : {}) };
  const { data: inserted, error } = await deps.db.from(TABLE).upsert({
    folder, email: d.email, first_name: d.firstName, last_name: d.lastName || null, business_name: d.businessName,
    phone: d.phone || null, website: d.website || null, data: d, summary: rows, files, meta,
  }, { onConflict: 'folder', ignoreDuplicates: true }).select('id');
  if (error) {
    console.error('insert failed', error.message);
    return reply(500, { error: 'We couldn’t save that. Nothing was lost on your side. Please try again.' }, origin);
  }
  if (!inserted || inserted.length === 0) return reply(200, { ok: true, duplicate: true }, origin); // already received
  const id: string = inserted[0].id;

  // Signed links so the owner can open files straight from the email.
  if (files.length) {
    const { data: signed } = await deps.db.storage.from(BUCKET)
      .createSignedUrls(files.map((f) => f.path), LINK_TTL_SECONDS);
    for (const s of signed ?? []) {
      const f = files.find((x) => x.path === s.path);
      if (f && s.signedUrl) f.url = s.signedUrl;
    }
  }

  const siteUrl = deps.env('SITE_URL', 'https://discovery.befortune5.com').replace(/\/$/, '');
  const bookingUrl = deps.env('BOOKING_URL', 'https://brandcraftsman.mambayk.com/book-a-call/');
  const notifyTo = deps.env('NOTIFY_TO');

  const errors: string[] = [];
  let ownerSent = false;
  let confirmationSent = false;
  const jobs: Promise<void>[] = [];

  if (notifyTo) {
    const m = ownerEmail({ id, data: d, rows, files, siteUrl, sentConfirmation: sendConfirmation });
    jobs.push(sendEmail(deps, { to: notifyTo, ...m, replyTo: d.email, key: `${id}-owner` }).then((e) => {
      if (e) errors.push(`owner: ${e}`); else ownerSent = true;
    }));
  } else errors.push('owner: NOTIFY_TO is not set.');

  if (sendConfirmation) {
    const m = confirmationEmail({ data: d, rows, siteUrl, bookingUrl });
    jobs.push(sendEmail(deps, { to: d.email, ...m, replyTo: notifyTo || undefined, key: `${id}-confirm` }).then((e) => {
      if (e) errors.push(`confirmation: ${e}`); else confirmationSent = true;
    }));
  } else errors.push('confirmation: skipped (3+ submissions from this address in 24h).');

  await Promise.all(jobs);
  await deps.db.from(TABLE).update({
    owner_emailed: ownerSent, confirmation_sent: confirmationSent, email_errors: errors.length ? errors.join('\n') : null,
  }).eq('id', id);
  if (errors.length) console.error('email issues for', id, errors.join(' | '));

  // The data is saved, so the submitter always sees success.
  return reply(200, { ok: true, id }, origin);
}

/* ---------------- entry ---------------- */

export function makeHandler(deps: Deps) {
  const allowed = deps.env('ALLOWED_ORIGINS', 'https://discovery.befortune5.com')
    .split(',').map((s) => s.trim()).filter(Boolean);

  return async (req: Request): Promise<Response> => {
    const { ok, origin } = originOk(req, allowed);
    if (!ok) return new Response(JSON.stringify({ error: 'Not allowed from this site.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    const path = new URL(req.url).pathname.replace(/\/+$/, '');
    if (req.method === 'GET' && path.endsWith('/health')) return reply(200, { ok: true }, origin);
    if (req.method !== 'POST') return reply(405, { error: 'Method not allowed.' }, origin);

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    try {
      const text = await req.text();
      if (text.length > MAX_BODY_CHARS) return reply(413, { error: 'That request is too large.' }, origin);
      let body: Any;
      try { body = JSON.parse(text); } catch { return reply(400, { error: 'Bad request.' }, origin); }

      if (path.endsWith('/upload-url')) return await uploadUrl(deps, body, ip, origin);
      if (path.endsWith('/submit')) return await submit(deps, body, ip, origin);
      return reply(404, { error: 'Not found.' }, origin);
    } catch (e) {
      console.error('unhandled', (e as Error).message);
      return reply(500, { error: 'Something went wrong on our side. Please try again.' }, origin);
    }
  };
}
