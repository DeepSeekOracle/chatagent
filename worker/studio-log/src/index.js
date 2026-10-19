/**
 * LYGO Studio edge endpoint.
 *
 * POST /log     sanitized browser failures -> KV (owner-only readable)
 * GET  /diag    owner-only recent failures (Authorization: Bearer ADMIN_TOKEN)
 * GET  /health  unsigned liveness
 * *    /proxy?url=...  allowlisted provider CORS proxy
 *
 * Never accepts or stores API keys, prompts, or image data.
 */

const MAX_BODY = 4096;
const MAX_ENTRIES = 100;

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "https://chatagent.ca,https://excavationpro.ca")
    .split(",").map(s => s.trim()).filter(Boolean);
  const h = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
  if (allowed.includes(origin) || origin.endsWith(".chatagent.pages.dev") || origin.endsWith(".excavationpro.pages.dev")) {
    h["Access-Control-Allow-Origin"] = origin;
  }
  return h;
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env) },
  });
}

function clean(value, max) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max || 300);
}

async function logFailure(request, env) {
  const origin = request.headers.get("Origin") || "";
  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const ipHash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  const rateKey = `rate:${ipHash}`;
  if (await env.FAILURES.get(rateKey)) return json({ ok: false, error: "rate_limited" }, 429, request, env);
  await env.FAILURES.put(rateKey, "1", { expirationTtl: 60 });
  const allowed = (env.ALLOWED_ORIGINS || "https://chatagent.ca,https://excavationpro.ca")
    .split(",").map(s => s.trim()).filter(Boolean);
  if (origin && !allowed.includes(origin)) return json({ ok: false, error: "origin" }, 403, request, env);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ ok: false, error: "too_large" }, 413, request, env);
  let body;
  try { body = JSON.parse(text); } catch { return json({ ok: false, error: "json" }, 400, request, env); }

  const entry = {
    ts: new Date().toISOString(),
    kind: clean(body.kind, 24) || "error",
    provider: clean(body.provider, 80),
    mode: clean(body.mode, 16),
    message: clean(body.message, 600),
    http: Number(body.http) || 0,
    page: clean(body.page, 120),
    ua: clean(body.ua, 160),
  };
  const key = `fail:${Date.now()}:${crypto.randomUUID()}`;
  await env.FAILURES.put(key, JSON.stringify(entry), { expirationTtl: 60 * 60 * 24 * 30 });
  return json({ ok: true }, 200, request, env);
}

async function diag(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const expected = `Bearer ${env.ADMIN_TOKEN || ""}`;
  if (!env.ADMIN_TOKEN || auth !== expected) return json({ ok: false, error: "unauthorized" }, 401, request, env);
  const list = await env.FAILURES.list({ prefix: "fail:", limit: MAX_ENTRIES });
  const entries = [];
  for (const k of list.keys) {
    const v = await env.FAILURES.get(k.name);
    if (v) entries.push(JSON.parse(v));
  }
  entries.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  return json({ ok: true, count: entries.length, entries }, 200, request, env);
}

async function proxy(request, env) {
  const u = new URL(request.url);
  const target = u.searchParams.get("url");
  if (!target) return json({ ok: false, error: "missing url" }, 400, request, env);
  let t;
  try { t = new URL(target); } catch { return json({ ok: false, error: "bad url" }, 400, request, env); }
  if (t.protocol !== "https:") return json({ ok: false, error: "https only" }, 400, request, env);
  const allowedHosts = (env.ALLOWED_HOSTS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!allowedHosts.includes(t.hostname)) return json({ ok: false, error: "host not allowed" }, 403, request, env);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("origin");
  const upstream = await fetch(t.toString(), {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "follow",
  });
  const out = new Response(upstream.body, upstream);
  for (const [k, v] of Object.entries(corsHeaders(request, env))) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ ok: true }, 200, request, env);
    if (url.pathname === "/log" && request.method === "POST") return logFailure(request, env);
    if (url.pathname === "/diag" && request.method === "GET") return diag(request, env);
    if (url.pathname === "/proxy") return proxy(request, env);
    return json({ ok: false, error: "not found" }, 404, request, env);
  },
};
