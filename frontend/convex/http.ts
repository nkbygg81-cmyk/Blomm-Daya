/// <reference lib="dom" />

import { httpRouter } from "convex/server";
import { httpAction as _httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

declare const process: { env?: Record<string, string | undefined> };

type AnyCtx = any;

const http = httpRouter();
// NOTE: In this project the generated `httpAction` type definition expects a different call
// signature than we use throughout this file. Runtime behavior is correct, so we cast to `any`
// to avoid TS blocking `convex_sync`.
const httpAction: any = _httpAction;

// Admin password (set ADMIN_PASSWORD in Convex Environment Variables)
function checkPassword(p: string): boolean {
  const env = process.env?.ADMIN_PASSWORD;
  if (!env) return false;
  return constantTimeEqual(p, env);
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlResponse(html: string, status = 200) {
  return new (globalThis as any).Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function redirect(location: string) {
  return new (globalThis as any).Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function json(body: unknown, status = 200) {
  return new (globalThis as any).Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function csvResponse(csv: string, filename: string) {
  return new (globalThis as any).Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "—";
  const d = new Date(timestamp);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function daysSince(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (days === 0) return "сьогодні";
  if (days === 1) return "1 день";
  if (days < 5) return `${days} дні`;
  return `${days} днів`;
}

function loginPage(): string {
  const missing = !process.env?.ADMIN_PASSWORD;
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Адмін - Вхід</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .box{background:#fff;padding:34px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.28);max-width:420px;width:100%}
    h1{color:#4f46e5;margin-bottom:10px;font-size:26px}
    p{color:#666;margin-bottom:22px;font-size:15px}
    input{width:100%;padding:14px 16px;border:2px solid #e5e7eb;border-radius:12px;font-size:16px;margin-bottom:14px}
    button{width:100%;padding:14px 16px;background:#4f46e5;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer}
    button:hover{background:#4338ca}
    .small{margin-top:14px;font-size:13px;color:#9ca3af;line-height:1.4}
    .warn{background:#fef3c7;border:2px solid #f59e0b;color:#92400e;padding:12px;border-radius:12px;margin-bottom:14px;font-size:13px;line-height:1.4}
    button[disabled], input[disabled]{opacity:.6;cursor:not-allowed}
  </style>
</head>
<body>
  <div class="box">
    <h1>Адмін панель</h1>
    ${missing ? `<div class="warn">ADMIN_PASSWORD не задано в Convex Environment Variables. Додайте змінну, щоб увімкнути доступ до адмін-панелі.</div>` : ""}
    <p>Введіть пароль для доступу</p>
    <form method="GET" action="/admin">
      <input type="password" name="p" placeholder="Пароль" required autofocus ${missing ? "disabled" : ""} />
      <button type="submit" ${missing ? "disabled" : ""}>Увійти</button>
    </form>
    <div class="small">Порада: не пересилайте посилання з паролем (він у URL).</div>
  </div>
</body>
</html>`;
}

function styles(): string {
  return `
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;padding:18px}
  .wrap{max-width:1200px;margin:0 auto}
  .top{background:#fff;padding:22px;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.18);margin-bottom:16px}
  h1{color:#4f46e5;font-size:28px;margin-bottom:6px}
  .sub{color:#6b7280;font-size:14px}
  
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:16px 0}
  .stat{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);padding:16px;border-radius:12px;border:2px solid #bfdbfe}
  .statNum{font-size:32px;font-weight:900;color:#1e40af;margin-bottom:4px}
  .statLabel{font-size:13px;color:#64748b;font-weight:600}
  
  .toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0;align-items:center}
  .toolbar input,.toolbar select{padding:10px 14px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px}
  .toolbar input{flex:1;min-width:200px}
  .toolbar select{min-width:120px}
  .toolbar .btnExport{padding:10px 20px;background:#10b981;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}
  .toolbar .btnFlorists{padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}
  
  .tabs{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
  .tabs a{padding:10px 14px;border-radius:12px;background:#e5e7eb;color:#374151;text-decoration:none;font-weight:800;font-size:14px}
  .tabs a.active{background:#4f46e5;color:#fff}
  .card{background:#fff;padding:18px;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.14);margin-bottom:14px}
  .cardTop{display:flex;justify-content:space-between;gap:10px;padding-bottom:12px;margin-bottom:12px;border-bottom:2px solid #f3f4f6}
  .title{font-size:18px;font-weight:900;color:#111827}
  .owner{font-size:14px;color:#6b7280;margin-top:4px}
  .badge{padding:6px 10px;border-radius:999px;font-weight:900;font-size:12px;text-transform:uppercase}
  .badge.pending{background:#fef3c7;color:#92400e}
  .badge.approved{background:#dcfce7;color:#166534}
  .badge.rejected{background:#fee2e2;color:#991b1b}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .field{background:#f9fafb;border:1px solid #eef2f7;border-radius:12px;padding:10px}
  .k{font-size:12px;color:#6b7280;margin-bottom:4px}
  .v{font-size:14px;color:#111827;font-weight:700;word-break:break-word}
  .dates{display:flex;gap:20px;margin:12px 0;padding:12px;background:#fef3c7;border-radius:10px;font-size:13px}
  .dates div{flex:1}
  .dates .label{color:#92400e;font-weight:700;margin-bottom:4px}
  .dates .value{color:#422006}
  .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
  .actions form{flex:1;min-width:220px}
  .reason{width:100%;padding:10px 12px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;margin-bottom:8px}
  .btn{width:100%;padding:12px 14px;border:none;border-radius:12px;font-size:14px;font-weight:900;cursor:pointer}
  .btnApprove{background:#10b981;color:#fff}
  .btnReject{background:#ef4444;color:#fff}
  .btnReset{background:#6b7280;color:#fff}
  .empty{padding:40px;text-align:center;color:#6b7280;font-size:16px}
  @media(max-width:720px){.grid{grid-template-columns:1fr}.toolbar{flex-direction:column}.toolbar input,.toolbar select{width:100%}}
</style>`;
}

// Fetch payment method type for a PaymentIntent (card, klarna, etc.)
async function getStripePaymentMethodType(opts: {
  stripeSecretKey: string;
  paymentIntentId: string;
}): Promise<string | null> {
  const qs = new (globalThis as any).URLSearchParams();
  qs.set("expand[0]", "charges.data.payment_method_details");

  const response = await (globalThis as any).fetch(
    `https://api.stripe.com/v1/payment_intents/${opts.paymentIntentId}?${qs.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${opts.stripeSecretKey}`,
      },
    },
  );

  if (!response.ok) return null;
  const pi = await response.json();
  const charge = pi?.charges?.data?.[0];
  const type = charge?.payment_method_details?.type;
  return typeof type === "string" && type.length ? type : null;
}

function hexFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyStripeSignature(
  body: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const webhookSecret = process.env?.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // If no secret configured, skip verification (dev mode)
    console.warn("STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
    return true;
  }
  if (!signatureHeader) return false;

  const parts: Record<string, string> = {};
  for (const pair of signatureHeader.split(",")) {
    const [k, v] = pair.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const timestamp = parts["t"];
  const expectedSig = parts["v1"];
  if (!timestamp || !expectedSig) return false;

  // Reject events older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  const payload = `${timestamp}.${body}`;
  const encoder = new (globalThis as any).TextEncoder();
  const key = await (globalThis as any).crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await (globalThis as any).crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  const computedHex = hexFromBytes(new Uint8Array(sig));
  return constantTimeEqual(computedHex, expectedSig);
}

http.route({
  path: "/admin",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const filter = (url.searchParams.get("f") ?? "pending").toLowerCase();
    const search = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const country = (url.searchParams.get("country") ?? "").trim().toUpperCase();

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const pending = await ctx.runQuery(api.floristApplications.listPending);
    const all = await ctx.runQuery(api.floristApplications.listAll);

    let apps: any[];
    if (filter === "pending") apps = pending;
    else if (filter === "approved") apps = all.filter((a: any) => a.status === "approved");
    else if (filter === "rejected") apps = all.filter((a: any) => a.status === "rejected");
    else apps = all;

    // Apply search filter
    if (search) {
      apps = apps.filter((a: any) => 
        a.email.toLowerCase().includes(search) ||
        a.businessName.toLowerCase().includes(search) ||
        a.city.toLowerCase().includes(search) ||
        a.ownerName.toLowerCase().includes(search)
      );
    }

    // Apply country filter
    if (country) {
      apps = apps.filter((a: any) => a.country === country);
    }

    const counts = {
      pending: pending.length,
      approved: all.filter((a: any) => a.status === "approved").length,
      rejected: all.filter((a: any) => a.status === "rejected").length,
      all: all.length,
    };

    // Calculate stats
    const avgProcessingTime = all
      .filter((a: any) => a.reviewedAt)
      .reduce((sum: number, a: any) => sum + (a.reviewedAt! - a.createdAt), 0) / 
      (all.filter((a: any) => a.reviewedAt).length || 1);
    const avgDays = Math.round(avgProcessingTime / (1000 * 60 * 60 * 24));

    const todayStart = new Date().setHours(0, 0, 0, 0);
    const newToday = all.filter((a: any) => a.createdAt >= todayStart).length;

    const link = (f: string) => {
      const params = new (globalThis as any).URLSearchParams();
      params.set("p", pwd);
      params.set("f", f);
      if (search) params.set("q", search);
      if (country) params.set("country", country);
      return `/admin?${params.toString()}`;
    };

    const cards = apps
      .map((a: any) => {
        const id = String(a._id);
        const status = String(a.status || "pending");
        const isPending = status === "pending";
        const waitingDays = daysSince(a.createdAt);

        const actions = isPending
          ? `
<div class="actions">
  <form method="POST" action="/admin/approve">
    <input type="hidden" name="p" value="${esc(pwd)}" />
    <input type="hidden" name="id" value="${esc(id)}" />
    <input type="hidden" name="returnUrl" value="${esc(req.url)}" />
    <button class="btn btnApprove" type="submit">✓ Підтвердити</button>
  </form>
  <form method="POST" action="/admin/reject">
    <input type="hidden" name="p" value="${esc(pwd)}" />
    <input type="hidden" name="id" value="${esc(id)}" />
    <input type="hidden" name="returnUrl" value="${esc(req.url)}" />
    <input class="reason" type="text" name="reason" placeholder="Причина відхилення (опціонально)" />
    <button class="btn btnReject" type="submit">✕ Відхилити</button>
  </form>
</div>`
          : `
<div class="actions">
  <form method="POST" action="/admin/reset">
    <input type="hidden" name="p" value="${esc(pwd)}" />
    <input type="hidden" name="id" value="${esc(id)}" />
    <input type="hidden" name="returnUrl" value="${esc(req.url)}" />
    <button class="btn btnReset" type="submit">↺ Повернути в pending</button>
  </form>
</div>`;

        return `
<div class="card">
  <div class="cardTop">
    <div>
      <div class="title">${esc(a.businessName)}</div>
      <div class="owner">${esc(a.ownerName)}</div>
    </div>
    <div class="badge ${esc(status)}">${esc(status)}</div>
  </div>

  <div class="dates">
    <div>
      <div class="label">📅 Створена</div>
      <div class="value">${formatDate(a.createdAt)}</div>
      <div class="value" style="font-size:12px;margin-top:4px;">(${waitingDays} тому)</div>
    </div>
    ${a.reviewedAt ? `<div>
      <div class="label">✅ Оброблена</div>
      <div class="value">${formatDate(a.reviewedAt)}</div>
    </div>` : ""}
  </div>

  <div class="grid">
    <div class="field"><div class="k">Email</div><div class="v">${esc(a.email)}</div></div>
    <div class="field"><div class="k">Телефон</div><div class="v">${esc(a.phone)}</div></div>
    <div class="field"><div class="k">Місто</div><div class="v">${esc(a.city)}, ${esc(a.country)}</div></div>
    <div class="field"><div class="k">Реєстр. номер</div><div class="v">${esc(a.registrationNumber)}</div></div>
    <div class="field" style="grid-column: 1 / -1;"><div class="k">Адреса</div><div class="v">${esc(a.address)}</div></div>
    ${a.description ? `<div class="field" style="grid-column: 1 / -1;"><div class="k">Опис</div><div class="v">${esc(a.description)}</div></div>` : ""}
  </div>

  ${actions}
</div>`;
      })
      .join("\n");

    const exportUrl = `/admin/export?p=${encodeURIComponent(pwd)}&f=${filter}${search ? `&q=${encodeURIComponent(search)}` : ""}${country ? `&country=${country}` : ""}`;
    const floristsUrl = `/admin/florists?p=${encodeURIComponent(pwd)}`;
    const catalogUrl = `/admin/catalog?p=${encodeURIComponent(pwd)}`;
    const settingsUrl = `/admin/settings?p=${encodeURIComponent(pwd)}`;
    const analyticsUrl = `/admin/analytics?p=${encodeURIComponent(pwd)}`;
    const ordersUrl = `/admin/orders?p=${encodeURIComponent(pwd)}`;
    const complaintsUrl = `/admin/complaints?p=${encodeURIComponent(pwd)}`;
    const messagesUrl = `/admin/messages?p=${encodeURIComponent(pwd)}`;
    const promoUrl = `/admin/promo?p=${encodeURIComponent(pwd)}`;
    const faqUrl = `/admin/faq?p=${encodeURIComponent(pwd)}`;
    const subscriptionsUrl = `/admin/subscriptions?p=${encodeURIComponent(pwd)}`;
    const pushUrl = `/admin/push?p=${encodeURIComponent(pwd)}`;
    const storiesUrl = `/admin/stories?p=${encodeURIComponent(pwd)}`;
    const consultationsUrl = `/admin/consultations?p=${encodeURIComponent(pwd)}`;
    const zonesUrl = `/admin/zones?p=${encodeURIComponent(pwd)}`;
    const realtimeUrl = `/admin/realtime?p=${encodeURIComponent(pwd)}`;
    const auditUrl = `/admin/audit?p=${encodeURIComponent(pwd)}`;
    const bannersUrl = `/admin/banners?p=${encodeURIComponent(pwd)}`;
    const eventsUrl = `/admin/events?p=${encodeURIComponent(pwd)}`;
    const referralsUrl = `/admin/referrals?p=${encodeURIComponent(pwd)}`;
    const cohortsUrl = `/admin/cohorts?p=${encodeURIComponent(pwd)}`;
    const reportsUrl = `/admin/reports?p=${encodeURIComponent(pwd)}`;
    const slaUrl = `/admin/sla?p=${encodeURIComponent(pwd)}`;
    const ratingsUrl = `/admin/ratings?p=${encodeURIComponent(pwd)}`;

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Адмін панель</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>🌸 Адмін панель</h1>
      <div class="sub">Управління заявками флористів</div>
      
      <div class="stats">
        <div class="stat">
          <div class="statNum">${counts.all}</div>
          <div class="statLabel">Всього заявок</div>
        </div>
        <div class="stat">
          <div class="statNum">${counts.pending}</div>
          <div class="statLabel">На розгляді</div>
        </div>
        <div class="stat">
          <div class="statNum">${newToday}</div>
          <div class="statLabel">Нових сьогодні</div>
        </div>
        <div class="stat">
          <div class="statNum">${avgDays}д</div>
          <div class="statLabel">Середній час обробки</div>
        </div>
      </div>

      <div class="toolbar">
        <form method="GET" action="/admin" style="display:flex;gap:10px;flex:1;flex-wrap:wrap;">
          <input type="hidden" name="p" value="${esc(pwd)}" />
          <input type="hidden" name="f" value="${esc(filter)}" />
          <input type="text" name="q" placeholder="Пошук по email, назві, місту..." value="${esc(search)}" />
          <select name="country" onchange="this.form.submit()">
            <option value="">Всі країни</option>
            <option value="SE" ${country === "SE" ? "selected" : ""}>SE (Швеція)</option>
            <option value="UA" ${country === "UA" ? "selected" : ""}>UA (Україна)</option>
            <option value="PL" ${country === "PL" ? "selected" : ""}>PL (Польща)</option>
          </select>
          <button type="submit" style="padding:10px 20px;background:#4f46e5;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;">🔍 Шукати</button>
        </form>
        <a href="${exportUrl}" class="btnExport">💾 Export CSV</a>
        <a href="${floristsUrl}" class="btnFlorists">👥 Флористи</a>
        <a href="${catalogUrl}" style="padding:10px 20px;background:#ec4899;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">🌸 Каталог</a>
        <a href="${analyticsUrl}" style="padding:10px 20px;background:#f59e0b;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">📊 Аналітика</a>
        <a href="${ordersUrl}" style="padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">📦 Замовлення</a>
        <a href="${complaintsUrl}" style="padding:10px 20px;background:#ef4444;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">📞 Скарги</a>
        <a href="${messagesUrl}" style="padding:10px 20px;background:#8b5cf6;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">📬 Повідомлення</a>
        <a href="${settingsUrl}" style="padding:10px 20px;background:#111827;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">⚙️ Налаштування</a>
        <a href="/admin/promo?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#059669;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">🏷️ Промокоди</a>
        <a href="/admin/faq?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#0891b2;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">❓ FAQ</a>
        <a href="/admin/subscriptions?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">🔄 Підписки</a>
        <a href="/admin/push?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#dc2626;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">🔔 Push</a>
        <a href="/admin/stories?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#ea580c;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">📸 Сторіс</a>
        <a href="/admin/consultations?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#be185d;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">💬 Консультації</a>
        <a href="/admin/zones?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#0d9488;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">🗺️ Зони доставки</a>
        <a href="/admin/realtime?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#7c2d12;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">⚡ Реалтайм</a>
        <a href="/admin/audit?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#475569;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">📋 Логи</a>
        <a href="/admin/banners?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#c026d3;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">🎨 Банери</a>
        <a href="/admin/events?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#16a34a;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">🎄 Події</a>
        <a href="/admin/referrals?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#0284c7;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">🤝 Реферали</a>
        <a href="/admin/cohorts?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#9333ea;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">📈 Когорти</a>
        <a href="/admin/reports?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#b45309;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">📊 Звіти</a>
        <a href="/admin/sla?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#dc2626;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">⏱️ SLA</a>
        <a href="/admin/ratings?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#a16207;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;">⚠️ Рейтинги</a>
      </div>

      <div class="tabs">
        <a class="${filter === "pending" ? "active" : ""}" href="${link("pending")}">Pending (${counts.pending})</a>
        <a class="${filter === "approved" ? "active" : ""}" href="${link("approved")}">Approved (${counts.approved})</a>
        <a class="${filter === "rejected" ? "active" : ""}" href="${link("rejected")}">Rejected (${counts.rejected})</a>
        <a class="${filter === "all" ? "active" : ""}" href="${link("all")}">All (${counts.all})</a>
      </div>
    </div>

    ${cards || '<div class="card"><div class="empty">📭 Немає заявок</div></div>'}
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// CSV Export
http.route({
  path: "/admin/export",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const filter = (url.searchParams.get("f") ?? "all").toLowerCase();
    const search = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const country = (url.searchParams.get("country") ?? "").trim().toUpperCase();

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const all = await ctx.runQuery(api.floristApplications.listAll);

    let apps: any[];
    if (filter === "pending") apps = all.filter((a: any) => a.status === "pending");
    else if (filter === "approved") apps = all.filter((a: any) => a.status === "approved");
    else if (filter === "rejected") apps = all.filter((a: any) => a.status === "rejected");
    else apps = all;

    // Apply filters
    if (search) {
      apps = apps.filter((a: any) => 
        a.email.toLowerCase().includes(search) ||
        a.businessName.toLowerCase().includes(search) ||
        a.city.toLowerCase().includes(search)
      );
    }
    if (country) {
      apps = apps.filter((a: any) => a.country === country);
    }

    // Generate CSV
    const csvRows = [
      ["Status", "Business Name", "Owner", "Email", "Phone", "City", "Country", "Address", "Reg Number", "Created", "Reviewed"],
      ...apps.map((a: any) => [
        a.status,
        a.businessName,
        a.ownerName,
        a.email,
        a.phone,
        a.city,
        a.country,
        a.address,
        a.registrationNumber,
        new Date(a.createdAt).toISOString(),
        a.reviewedAt ? new Date(a.reviewedAt).toISOString() : "",
      ])
    ];

    const csv = csvRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const filename = `florist-applications-${filter}-${new Date().toISOString().split("T")[0]}.csv`;
    return csvResponse(csv, filename);
  }),
});

// Florists management page
http.route({
  path: "/admin/florists",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const florists = await ctx.runQuery(api.floristApplications.listFlorists);
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const floristCards = florists
      .map((f: any) => {
        const toggleUrl = `/admin/florists/toggle?p=${encodeURIComponent(pwd)}&id=${f._id}`;
        return `
<div class="card">
  <div class="cardTop">
    <div>
      <div class="title">${esc(f.name)}</div>
      <div class="owner">${esc(f.email || "немає email")}</div>
    </div>
    <div class="badge ${f.available ? "approved" : "rejected"}">${f.available ? "активний" : "вимкнений"}</div>
  </div>
  <div class="grid">
    <div class="field"><div class="k">Телефон</div><div class="v">${esc(f.phone || "—")}</div></div>
    <div class="field"><div class="k">Місто</div><div class="v">${esc(f.city || "—")}, ${esc(f.country || "—")}</div></div>
    <div class="field"><div class="k">Рейтинг</div><div class="v">${f.rating || 0} ⭐</div></div>
    <div class="field"><div class="k">Реєстр. номер</div><div class="v">${esc(f.registrationNumber || "—")}</div></div>
    <div class="field" style="grid-column: 1 / -1;"><div class="k">Адреса</div><div class="v">${esc(f.address || "—")}</div></div>
  </div>
  <div class="actions">
    <form method="POST" action="${toggleUrl}">
      <button class="btn ${f.available ? "btnReset" : "btnApprove"}" type="submit">
        ${f.available ? "🔴 Вимкнути" : "✅ Увімкнути"}
      </button>
    </form>
  </div>
</div>`;
      })
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Управління флористами</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>👥 Управління флористами</h1>
      <div class="sub">Всього флористів: ${florists.length}</div>
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад до заявок</a>
      </div>
    </div>
    ${floristCards || '<div class="card"><div class="empty">Немає флористів</div></div>'}
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Toggle florist availability
http.route({
  path: "/admin/florists/toggle",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = url.searchParams.get("p") ?? "";
    const id = url.searchParams.get("id") ?? "";

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.floristApplications.toggleFloristAvailability, { 
      floristId: id as any 
    });

    return redirect(`/admin/florists?p=${encodeURIComponent(pwd)}`);
  }),
});

http.route({
  path: "/admin/approve",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const returnUrl = String(form.get("returnUrl") ?? "");

    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });

    await ctx.runMutation(api.floristApplications.approve, {
      applicationId: id as any,
    });

    const fallbackUrl = `/admin?p=${encodeURIComponent(pwd)}&f=pending`;
    return redirect(returnUrl || fallbackUrl);
  }),
});

http.route({
  path: "/admin/reject",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const reason = String(form.get("reason") ?? "").trim();
    const returnUrl = String(form.get("returnUrl") ?? "");

    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });

    await ctx.runMutation(api.floristApplications.reject, {
      applicationId: id as any,
      reason: reason || undefined,
    });

    const fallbackUrl = `/admin?p=${encodeURIComponent(pwd)}&f=pending`;
    return redirect(returnUrl || fallbackUrl);
  }),
});

http.route({
  path: "/admin/reset",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const returnUrl = String(form.get("returnUrl") ?? "");

    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });

    await ctx.runMutation(api.floristApplications.resetToPending, {
      applicationId: id as any,
    });

    const fallbackUrl = `/admin?p=${encodeURIComponent(pwd)}&f=pending`;
    return redirect(returnUrl || fallbackUrl);
  }),
});

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const body = await req.text();
    const signatureHeader = req.headers.get("stripe-signature");

    const valid = await verifyStripeSignature(body, signatureHeader);
    if (!valid) {
      console.error("Stripe webhook signature verification failed");
      return json({ error: "Invalid signature" }, 400);
    }

    const event = JSON.parse(body);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const items = JSON.parse(metadata.items || "[]");
      const gifts = JSON.parse(metadata.gifts || "[]");
      const floristId = metadata.floristId || undefined;
      const deliveryType = metadata.deliveryType || "delivery";
      const promoCode = metadata.promoCode || undefined;
      const promoDiscount = metadata.promoDiscount ? parseFloat(metadata.promoDiscount) : undefined;
      const deliveryFee = metadata.deliveryFee ? parseFloat(metadata.deliveryFee) : undefined;

      const stripeSecretKey = process.env?.STRIPE_SECRET_KEY;
      const paymentIntentId = session.payment_intent;

      let paymentMethodType: string | null = null;
      if (stripeSecretKey && typeof paymentIntentId === "string" && paymentIntentId.length) {
        paymentMethodType = await getStripePaymentMethodType({
          stripeSecretKey,
          paymentIntentId,
        });
      }

      const orderId = await ctx.runMutation(internal.buyerOrders.createFromStripeWebhook, {
        sessionId: session.id,
        buyerDeviceId: metadata.buyerDeviceId,
        customerName: metadata.customerName,
        customerPhone: metadata.customerPhone,
        deliveryType: deliveryType as any,
        deliveryAddress: metadata.deliveryAddress,
        note: metadata.note || undefined,
        items,
        gifts,
        stripePaymentIntentId: session.payment_intent,
        paymentMethodType: paymentMethodType ?? undefined,
        floristId: floristId ? (floristId as any) : undefined,
        promoCode: promoCode,
        promoDiscount: promoDiscount,
        deliveryFee: deliveryFee,
      });

      // Automatically transfer to florist if floristId is present
      if (floristId && session.amount_total) {
        try {
          await ctx.runAction(api.stripeConnect.transferToFlorist, {
            orderId: orderId,
            amount: session.amount_total, // Amount in cents
            floristId: floristId as any,
          });
          console.log(`✅ Auto-transferred ${session.amount_total / 100} SEK to florist ${floristId}`);
        } catch (error) {
          // Auto-transfer failed - order still created
        }
      }

      return json({ received: true });
    }

    return json({ received: true });
  }),
});

// ==========================================
// ADMIN: Financial Analytics
// ==========================================
http.route({
  path: "/admin/analytics",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const period = (url.searchParams.get("period") ?? "month") as any;

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const stats = await ctx.runQuery(api.admin.getFinancialStats, { period });
    const analytics = await ctx.runQuery(api.admin.getAnalytics, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const periodLinks = ["week", "month", "year", "all"].map(p => {
      const isActive = p === period;
      return `<a href="/admin/analytics?p=${encodeURIComponent(pwd)}&period=${p}" class="${isActive ? "active" : ""}">${p === "week" ? "Тиждень" : p === "month" ? "Місяць" : p === "year" ? "Рік" : "Весь час"}</a>`;
    }).join("");

    const topFloristsHtml = stats.topFlorists.map((f: any) => `
      <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #e5e7eb;">
        <span style="font-weight:600;">${esc(f.name)}</span>
        <span><strong>${f.revenue.toFixed(0)} kr</strong> (${f.orders} замовлень)</span>
      </div>
    `).join("");

    const countryHtml = stats.revenueByCountry.map((c: any) => `
      <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #e5e7eb;">
        <span style="font-weight:600;">${esc(c.country)}</span>
        <span><strong>${c.revenue.toFixed(0)} kr</strong> (${c.orders} замовлень)</span>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Фінансова аналітика</title>
  ${styles()}
  <style>
    .chart{background:#f9fafb;border-radius:12px;padding:16px;margin:16px 0}
    .chart-bar{height:8px;background:#4f46e5;border-radius:4px;margin-top:4px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>📊 Фінансова аналітика</h1>
      <div class="sub">Дохід та статистика платформи</div>
      
      <div class="tabs" style="margin:16px 0;">
        ${periodLinks}
      </div>
      
      <div class="stats">
        <div class="stat">
          <div class="statNum">${stats.totalRevenue.toFixed(0)} kr</div>
          <div class="statLabel">Загальний дохід</div>
        </div>
        <div class="stat" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-color:#86efac;">
          <div class="statNum" style="color:#166534;">${stats.platformCommission.toFixed(0)} kr</div>
          <div class="statLabel">Комісія платформи (15%)</div>
        </div>
        <div class="stat">
          <div class="statNum">${stats.floristEarnings.toFixed(0)} kr</div>
          <div class="statLabel">Заробіток флористів (85%)</div>
        </div>
        <div class="stat">
          <div class="statNum">${stats.orderCount}</div>
          <div class="statLabel">Замовлень</div>
        </div>
        <div class="stat">
          <div class="statNum">${stats.avgOrderValue.toFixed(0)} kr</div>
          <div class="statLabel">Середній чек</div>
        </div>
      </div>
      
      <div class="stats" style="margin-top:8px;">
        <div class="stat">
          <div class="statNum">${analytics.totalBuyers}</div>
          <div class="statLabel">Всього покупців</div>
        </div>
        <div class="stat">
          <div class="statNum">${analytics.activeBuyersWeek}</div>
          <div class="statLabel">Активних (тиждень)</div>
        </div>
        <div class="stat">
          <div class="statNum">${analytics.totalFlorists}</div>
          <div class="statLabel">Всього флористів</div>
        </div>
        <div class="stat">
          <div class="statNum">${analytics.activeFlorists}</div>
          <div class="statLabel">Активних флористів</div>
        </div>
        <div class="stat">
          <div class="statNum">${analytics.conversionRate.toFixed(1)}%</div>
          <div class="statLabel">Конверсія</div>
        </div>
      </div>

      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
        <a href="/admin/orders?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#4f46e5;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;margin-left:8px;">📦 Замовлення</a>
        <a href="/admin/reviews?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#f59e0b;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;margin-left:8px;">⭐ Відгуки</a>
        <a href="/admin/buyers?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#10b981;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;margin-left:8px;">👥 Покупці</a>
      </div>
    </div>

    <div class="card">
      <div class="title">🏆 Топ флористів</div>
      ${topFloristsHtml || '<div class="empty">Немає даних</div>'}
    </div>

    <div class="card">
      <div class="title">🌍 Дохід по країнах</div>
      ${countryHtml || '<div class="empty">Немає даних</div>'}
    </div>
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// ==========================================
// ADMIN: Orders Management
// ==========================================
http.route({
  path: "/admin/orders",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const status = url.searchParams.get("status") ?? "";
    const search = url.searchParams.get("q") ?? "";

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const orders = await ctx.runQuery(api.admin.listAllOrders, {
      status: status || undefined,
      search: search || undefined,
      limit: 100,
    });

    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const statusBadge = (s: string) => {
      const colors: Record<string, string> = {
        pending: "background:#fef3c7;color:#92400e",
        confirmed: "background:#dbeafe;color:#1e40af",
        preparing: "background:#e0e7ff;color:#3730a3",
        ready: "background:#d1fae5;color:#065f46",
        delivering: "background:#fce7f3;color:#9d174d",
        delivered: "background:#dcfce7;color:#166534",
        cancelled: "background:#fee2e2;color:#991b1b",
      };
      return `<span style="padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;${colors[s] || "background:#e5e7eb;color:#374151"}">${s}</span>`;
    };

    const ordersHtml = orders.map((o: any) => `
      <div class="card">
        <div class="cardTop">
          <div>
            <div class="title">${esc(o.customerName)}</div>
            <div class="owner">${esc(o.customerPhone)}</div>
          </div>
          <div>${statusBadge(o.status)}</div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Адреса</div><div class="v">${esc(o.deliveryAddress)}</div></div>
          <div class="field"><div class="k">Тип</div><div class="v">${o.deliveryType === "pickup" ? "🏪 Самовивіз" : "🚗 Доставка"}</div></div>
          <div class="field"><div class="k">Сума</div><div class="v"><strong>${o.total} kr</strong></div></div>
          <div class="field"><div class="k">Товарів</div><div class="v">${o.itemCount}</div></div>
          <div class="field"><div class="k">Оплата</div><div class="v">${o.paymentMethodType || "—"} ${o.paymentStatus === "paid" ? "✅" : "⏳"}</div></div>
          <div class="field"><div class="k">Флорист</div><div class="v">${esc(o.floristName || "Не призначено")}</div></div>
          <div class="field"><div class="k">Дата</div><div class="v">${formatDate(o.createdAt)}</div></div>
        </div>
        <div class="actions">
          <form method="POST" action="/admin/orders/status" style="display:flex;gap:8px;flex-wrap:wrap;">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${o._id}" />
            <input type="hidden" name="returnUrl" value="${esc(req.url)}" />
            <select name="status" style="padding:10px;border:2px solid #e5e7eb;border-radius:8px;flex:1;">
              <option value="pending" ${o.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="confirmed" ${o.status === "confirmed" ? "selected" : ""}>Confirmed</option>
              <option value="preparing" ${o.status === "preparing" ? "selected" : ""}>Preparing</option>
              <option value="ready" ${o.status === "ready" ? "selected" : ""}>Ready</option>
              <option value="delivering" ${o.status === "delivering" ? "selected" : ""}>Delivering</option>
              <option value="delivered" ${o.status === "delivered" ? "selected" : ""}>Delivered</option>
              <option value="cancelled" ${o.status === "cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
            <button type="submit" class="btn btnApprove" style="width:auto;padding:10px 20px;">Змінити статус</button>
          </form>
        </div>
      </div>
    `).join("");

    const statusFilter = ["", "pending", "confirmed", "preparing", "ready", "delivering", "delivered", "cancelled"];
    const statusOptions = statusFilter.map(s => 
      `<option value="${s}" ${status === s ? "selected" : ""}>${s || "Всі статуси"}</option>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Управління замовленнями</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>📦 Управління замовленнями</h1>
      <div class="sub">Всього замовлень: ${orders.length}</div>
      
      <div class="toolbar">
        <form method="GET" action="/admin/orders" style="display:flex;gap:10px;flex:1;flex-wrap:wrap;">
          <input type="hidden" name="p" value="${esc(pwd)}" />
          <input type="text" name="q" placeholder="Пошук по імені, телефону, адресі..." value="${esc(search)}" />
          <select name="status" onchange="this.form.submit()">
            ${statusOptions}
          </select>
          <button type="submit" style="padding:10px 20px;background:#4f46e5;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;">🔍 Шукати</button>
        </form>
      </div>
      
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
        <a href="/admin/analytics?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#4f46e5;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;margin-left:8px;">📊 Аналітика</a>
      </div>
    </div>

    ${ordersHtml || '<div class="card"><div class="empty">📭 Немає замовлень</div></div>'}
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Update order status
http.route({
  path: "/admin/orders/status",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const status = String(form.get("status") ?? "");
    const returnUrl = String(form.get("returnUrl") ?? "");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.updateOrderStatus, {
      orderId: id as any,
      status,
    });

    const fallbackUrl = `/admin/orders?p=${encodeURIComponent(pwd)}`;
    return redirect(returnUrl || fallbackUrl);
  }),
});

// ==========================================
// ADMIN: Reviews Moderation
// ==========================================
http.route({
  path: "/admin/reviews",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const reviews = await ctx.runQuery(api.admin.listAllReviews, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const stars = (n: number) => "⭐".repeat(Math.round(n));

    const reviewsHtml = reviews.map((r: any) => `
      <div class="card" style="${r.flagged ? 'border:2px solid #ef4444;' : ''}">
        <div class="cardTop">
          <div>
            <div class="title">${stars(r.rating)} ${r.rating}/5</div>
            <div class="owner">${esc(r.buyerEmail || "Анонім")} → ${esc(r.floristName || "Невідомий флорист")}</div>
          </div>
          <div style="font-size:12px;color:#6b7280;">${formatDate(r.createdAt)}</div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Якість</div><div class="v">${stars(r.qualityRating)} ${r.qualityRating}/5</div></div>
          <div class="field"><div class="k">Доставка</div><div class="v">${stars(r.deliveryRating)} ${r.deliveryRating}/5</div></div>
          ${r.comment ? `<div class="field" style="grid-column:1/-1;"><div class="k">Коментар</div><div class="v">"${esc(r.comment)}"</div></div>` : ""}
        </div>
        <div class="actions">
          <form method="POST" action="/admin/reviews/delete">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${r._id}" />
            <button type="submit" class="btn btnReject" onclick="return confirm('Видалити цей відгук?')">🗑️ Видалити</button>
          </form>
          <form method="POST" action="/admin/reviews/flag">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${r._id}" />
            <input type="hidden" name="flagged" value="${r.flagged ? 'false' : 'true'}" />
            <button type="submit" class="btn ${r.flagged ? 'btnApprove' : 'btnReset'}">${r.flagged ? '✅ Зняти прапорець' : '🚩 Позначити'}</button>
          </form>
        </div>
      </div>
    `).join("");

    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "0";

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Модерація відгуків</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>⭐ Модерація відгуків</h1>
      <div class="sub">Всього відгуків: ${reviews.length} | Середній рейтинг: ${avgRating}/5</div>
      
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
        <a href="/admin/portfolio?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#ec4899;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;margin-left:8px;">🖼️ Портфоліо</a>
      </div>
    </div>

    ${reviewsHtml || '<div class="card"><div class="empty">📭 Немає відгуків</div></div>'}
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Delete review
http.route({
  path: "/admin/reviews/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.deleteReview, { reviewId: id as any });
    return redirect(`/admin/reviews?p=${encodeURIComponent(pwd)}`);
  }),
});

// Flag review
http.route({
  path: "/admin/reviews/flag",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const flagged = String(form.get("flagged") ?? "") === "true";

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.flagReview, { reviewId: id as any, flagged });
    return redirect(`/admin/reviews?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Buyers Management
// ==========================================
http.route({
  path: "/admin/buyers",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const search = url.searchParams.get("q") ?? "";

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const buyers = await ctx.runQuery(api.admin.listAllBuyers, {
      search: search || undefined,
      limit: 100,
    });

    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const buyersHtml = buyers.map((b: any) => `
      <div class="card" style="${b.blocked ? 'border:2px solid #ef4444;opacity:0.7;' : ''}">
        <div class="cardTop">
          <div>
            <div class="title">${esc(b.name || "Без імені")}</div>
            <div class="owner">${esc(b.email)}</div>
          </div>
          <div class="badge ${b.blocked ? 'rejected' : 'approved'}">${b.blocked ? 'Заблокований' : 'Активний'}</div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Телефон</div><div class="v">${esc(b.phone || "—")}</div></div>
          <div class="field"><div class="k">Реєстрація</div><div class="v">${formatDate(b.createdAt)}</div></div>
          <div class="field"><div class="k">Останній вхід</div><div class="v">${formatDate(b.lastLoginAt)}</div></div>
        </div>
        <div class="actions">
          <form method="POST" action="/admin/buyers/block">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${b._id}" />
            <input type="hidden" name="blocked" value="${b.blocked ? 'false' : 'true'}" />
            <button type="submit" class="btn ${b.blocked ? 'btnApprove' : 'btnReset'}">${b.blocked ? '✅ Розблокувати' : '🚫 Заблокувати'}</button>
          </form>
          <form method="POST" action="/admin/buyers/delete">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${b._id}" />
            <button type="submit" class="btn btnReject" onclick="return confirm('Видалити цього користувача? Це незворотня дія!')">🗑️ Видалити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Управління покупцями</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>👥 Управління покупцями</h1>
      <div class="sub">Всього покупців: ${buyers.length}</div>
      
      <div class="toolbar">
        <form method="GET" action="/admin/buyers" style="display:flex;gap:10px;flex:1;">
          <input type="hidden" name="p" value="${esc(pwd)}" />
          <input type="text" name="q" placeholder="Пошук по email, імені, телефону..." value="${esc(search)}" />
          <button type="submit" style="padding:10px 20px;background:#4f46e5;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;">🔍 Шукати</button>
        </form>
      </div>
      
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
        <a href="/admin/analytics?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#4f46e5;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;margin-left:8px;">📊 Аналітика</a>
      </div>
    </div>

    ${buyersHtml || '<div class="card"><div class="empty">📭 Немає покупців</div></div>'}
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Block/unblock buyer
http.route({
  path: "/admin/buyers/block",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const blocked = String(form.get("blocked") ?? "") === "true";

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.blockBuyer, { buyerId: id as any, blocked });
    return redirect(`/admin/buyers?p=${encodeURIComponent(pwd)}`);
  }),
});

// Delete buyer
http.route({
  path: "/admin/buyers/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.deleteBuyer, { buyerId: id as any });
    return redirect(`/admin/buyers?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Portfolio Moderation
// ==========================================
http.route({
  path: "/admin/portfolio",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const photos = await ctx.runQuery(api.admin.listAllPortfolioPhotos, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const photosHtml = photos.map((p: any) => `
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" style="width:100%;height:200px;object-fit:cover;" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%239ca3af%22>No image</text></svg>'\" />` : '<div style="width:100%;height:200px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;">No image</div>'}
        <div style="padding:12px;">
          <div style="font-weight:700;color:#111827;margin-bottom:4px;">${esc(p.floristName || "Unknown")}</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:8px;">${esc(p.description || "No description")}</div>
          ${p.price ? `<div style="font-weight:700;color:#4f46e5;">${p.price} kr</div>` : ""}
          <div style="font-size:11px;color:#9ca3af;margin-top:8px;">${formatDate(p.createdAt)}</div>
          <form method="POST" action="/admin/portfolio/delete" style="margin-top:8px;">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${p._id}" />
            <button type="submit" style="width:100%;padding:8px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;" onclick="return confirm('Видалити це фото?')">🗑️ Видалити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Модерація портфоліо</title>
  ${styles()}
  <style>
    .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-top:16px;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>🖼️ Модерація портфоліо</h1>
      <div class="sub">Всього фото: ${photos.length}</div>
      
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
        <a href="/admin/reviews?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#f59e0b;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;margin-left:8px;">⭐ Відгуки</a>
      </div>
    </div>

    <div class="photo-grid">
      ${photosHtml || '<div class="card" style="grid-column:1/-1;"><div class="empty">📭 Немає фото</div></div>'}
    </div>
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Delete portfolio photo
http.route({
  path: "/admin/portfolio/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.deletePortfolioPhoto, { photoId: id as any });
    return redirect(`/admin/portfolio?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Categories Management
// ==========================================
http.route({
  path: "/admin/categories",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const categories = await ctx.runQuery(api.admin.listCategories, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const categoriesHtml = categories.map((c: any) => `
      <div class="card">
        <div class="cardTop">
          <div>
            <div class="title">${esc(c.nameUk || c.name)}</div>
            <div class="owner">${esc(c.type)} • ${c.active ? "активна" : "вимкнена"}</div>
          </div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Назва (EN)</div><div class="v">${esc(c.name)}</div></div>
          <div class="field"><div class="k">Назва (SV)</div><div class="v">${esc(c.nameSv || "—")}</div></div>
          <div class="field"><div class="k">Іконка</div><div class="v">${esc(c.icon || "—")}</div></div>
          <div class="field"><div class="k">Порядок</div><div class="v">${typeof c.sortOrder === "number" ? c.sortOrder : "—"}</div></div>
        </div>
        <div class="actions">
          <form method="POST" action="/admin/categories/delete">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${c._id}" />
            <button type="submit" class="btn btnReject" onclick="return confirm('Видалити цю категорію?')">🗑️ Видалити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Управління категоріями</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>📂 Управління категоріями</h1>
      <div class="sub">Всього категорій: ${categories.length}</div>
      
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
      </div>
    </div>

    ${categoriesHtml || '<div class="card"><div class="empty">📭 Немає категорій</div></div>'}
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Delete category
http.route({
  path: "/admin/categories/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.deleteCategory, { categoryId: id as any });
    return redirect(`/admin/categories?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Complaints/Support Tickets
// ==========================================
http.route({
  path: "/admin/complaints",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const status = url.searchParams.get("status") ?? "";

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const complaints = await ctx.runQuery(api.admin.listComplaints, {
      status: status || undefined,
    });
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const priorityBadge = (p: string) => {
      const colors: Record<string, string> = {
        low: "background:#d1fae5;color:#065f46",
        medium: "background:#fef3c7;color:#92400e",
        high: "background:#fee2e2;color:#991b1b",
      };
      return `<span style="padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;${colors[p] || "background:#e5e7eb;color:#374151"}">${p}</span>`;
    };

    const complaintsHtml = complaints.map((c: any) => `
      <div class="card">
        <div class="cardTop">
          <div>
            <div class="title">${esc(c.subject)}</div>
            <div class="owner">${esc(c.reporterEmail)} (${esc(c.reporterType)}) • ${esc(c.status)}</div>
          </div>
          <div>${priorityBadge(c.priority)}</div>
        </div>
        <div class="grid">
          <div class="field" style="grid-column:1/-1;"><div class="k">Опис</div><div class="v">${esc(c.description)}</div></div>
          <div class="field"><div class="k">Дата</div><div class="v">${formatDate(c.createdAt)}</div></div>
          <div class="field"><div class="k">Тип</div><div class="v">${esc(c.type)}</div></div>
          <div class="field"><div class="k">Повідомлень</div><div class="v">${c.messageCount || 0}</div></div>
        </div>
        <div class="actions">
          <form method="POST" action="/admin/complaints/status">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${c._id}" />
            <select name="status" style="padding:10px;border:2px solid #e5e7eb;border-radius:8px;width:100%;margin-bottom:8px;">
              <option value="open" ${c.status === "open" ? "selected" : ""}>Відкрита</option>
              <option value="in_progress" ${c.status === "in_progress" ? "selected" : ""}>В процесі</option>
              <option value="resolved" ${c.status === "resolved" ? "selected" : ""}>Вирішена</option>
              <option value="closed" ${c.status === "closed" ? "selected" : ""}>Закрита</option>
            </select>
            <button type="submit" class="btn btnApprove">✅ Оновити статус</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Скарги та підтримка</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>📞 Скарги та підтримка</h1>
      <div class="sub">Всього скарг: ${complaints.length}</div>
      
      <div class="toolbar">
        <form method="GET" action="/admin/complaints" style="display:flex;gap:10px;">
          <input type="hidden" name="p" value="${esc(pwd)}" />
          <select name="status" onchange="this.form.submit()">
            <option value="">Всі статуси</option>
            <option value="open" ${status === "open" ? "selected" : ""}>Відкрита</option>
            <option value="in_progress" ${status === "in_progress" ? "selected" : ""}>В процесі</option>
            <option value="resolved" ${status === "resolved" ? "selected" : ""}>Вирішена</option>
            <option value="closed" ${status === "closed" ? "selected" : ""}>Закрита</option>
          </select>
        </form>
      </div>
      
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
      </div>
    </div>

    ${complaintsHtml || '<div class="card"><div class="empty">📭 Немає скарг</div></div>'}
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Update complaint status
http.route({
  path: "/admin/complaints/status",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const status = String(form.get("status") ?? "");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.updateComplaint, {
      complaintId: id as any,
      status: status as any,
    });

    return redirect(`/admin/complaints?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: System Messages/Broadcast
// ==========================================
http.route({
  path: "/admin/messages",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const messages = await ctx.runQuery(api.admin.listSystemMessages, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const messagesHtml = messages.map((m: any) => `
      <div class="card">
        <div class="cardTop">
          <div>
            <div class="title">${esc(m.title)}</div>
            <div class="owner">${esc(m.body.substring(0, 80))}${m.body.length > 80 ? "..." : ""}</div>
          </div>
          <div class="badge ${m.status === "sent" ? "approved" : "pending"}">${esc(m.status)}</div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Тип</div><div class="v">${esc(m.type)}</div></div>
          <div class="field"><div class="k">Аудиторія</div><div class="v">${esc(m.targetAudience)}</div></div>
          <div class="field"><div class="k">Створено</div><div class="v">${formatDate(m.createdAt)}</div></div>
          <div class="field"><div class="k">Надіслано</div><div class="v">${m.sentAt ? formatDate(m.sentAt) : "—"}</div></div>
          <div class="field"><div class="k">Отримувачів</div><div class="v">${m.recipientCount ?? "—"}</div></div>
        </div>
        <div class="actions">
          ${m.status !== "sent" ? `
            <form method="POST" action="/admin/messages/send">
              <input type="hidden" name="p" value="${esc(pwd)}" />
              <input type="hidden" name="id" value="${m._id}" />
              <button type="submit" class="btn btnApprove" onclick="return confirm('Надіслати це повідомлення зараз?')">📤 Надіслати</button>
            </form>
          ` : ""}
          <form method="POST" action="/admin/messages/delete">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${m._id}" />
            <button type="submit" class="btn btnReject" onclick="return confirm('Видалити це повідомлення?')">🗑️ Видалити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Системні повідомлення</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>📬 Системні повідомлення</h1>
      <div class="sub">Активних повідомлень: ${messages.length}</div>
      
      <div class="card" style="margin:16px 0;">
        <h3 style="margin-bottom:12px;">➕ Нове повідомлення</h3>
        <form method="POST" action="/admin/messages/create">
          <input type="hidden" name="p" value="${esc(pwd)}" />
          <input type="text" name="title" placeholder="Заголовок" required style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
          <textarea name="body" placeholder="Текст повідомлення" required style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;font-size:14px;" rows="4"></textarea>
          <select name="type" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;">
            <option value="announcement">Оголошення</option>
            <option value="promotion">Промо</option>
            <option value="maintenance">Обслуговування</option>
            <option value="update">Оновлення</option>
          </select>
          <select name="targetAudience" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;">
            <option value="all">Всім</option>
            <option value="buyers">Тільки покупцям</option>
            <option value="florists">Тільки флористам</option>
          </select>
          <button type="submit" class="btn btnApprove">✅ Створити</button>
        </form>
      </div>
      
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
      </div>
    </div>

    ${messagesHtml || '<div class="card"><div class="empty">📭 Немає повідомлень</div></div>'}
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Create system message
http.route({
  path: "/admin/messages/create",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const title = String(form.get("title") ?? "");
    const body = String(form.get("body") ?? "");
    const type = String(form.get("type") ?? "announcement");
    const targetAudience = String(form.get("targetAudience") ?? "all");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.createSystemMessage, {
      title,
      body,
      type: type as any,
      targetAudience: targetAudience as any,
    });

    return redirect(`/admin/messages?p=${encodeURIComponent(pwd)}`);
  }),
});

// Send system message
http.route({
  path: "/admin/messages/send",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.sendSystemMessage, {
      messageId: id as any,
    });

    return redirect(`/admin/messages?p=${encodeURIComponent(pwd)}`);
  }),
});

// Delete system message
http.route({
  path: "/admin/messages/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.deleteSystemMessage, {
      messageId: id as any,
    });

    return redirect(`/admin/messages?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Platform Settings
// ==========================================
http.route({
  path: "/admin/settings",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const settings = await ctx.runQuery(api.admin.getPlatformSettings, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Налаштування платформи</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>⚙️ Налаштування платформи</h1>
      <div class="sub">Основні параметри системи</div>
      
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:16px;">💰 Комісія платформи</h2>
      <form method="POST" action="/admin/settings/update">
        <input type="hidden" name="p" value="${esc(pwd)}" />
        
        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Комісія платформи (%)</label>
          <input type="number" name="platformCommission" value="${settings.platformCommission || 15}" min="0" max="50" step="0.1" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;font-size:16px;" />
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Частина, яку потримує платформа (0-50%)</div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Мінімальна вартість замовлення (kr)</label>
          <input type="number" name="minimumOrderValue" value="${settings.minimumOrderValue || 50}" min="0" step="10" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;font-size:16px;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Комісія за доставку (kr)</label>
          <input type="number" name="deliveryFee" value="${settings.deliveryFee || 50}" min="0" step="10" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;font-size:16px;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">
            <input type="checkbox" name="maintenanceMode" ${settings.maintenanceMode ? "checked" : ""} />
            🔧 Режим обслуговування
          </label>
          <div style="font-size:12px;color:#6b7280;">Користувачі не зможуть робити замовлення</div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">
            <input type="checkbox" name="loyaltyEnabled" ${settings.loyaltyEnabled ? "checked" : ""} />
            🎁 Програма лояльності
          </label>
          <div style="font-size:12px;color:#6b7280;">Увімкнути/вимкнути систему бонусних балів для покупців</div>
        </div>

        <button type="submit" class="btn btnApprove">💾 Зберегти</button>
      </form>
    </div>
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Update settings
http.route({
  path: "/admin/settings/update",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.admin.updatePlatformSettings, {
      platformCommission: parseFloat(String(form.get("platformCommission") ?? "15")),
      minimumOrderValue: parseInt(String(form.get("minimumOrderValue") ?? "50")),
      deliveryFee: parseInt(String(form.get("deliveryFee") ?? "50")),
      maintenanceMode: form.get("maintenanceMode") === "on",
      loyaltyEnabled: form.get("loyaltyEnabled") === "on",
    });

    return redirect(`/admin/settings?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Flower Catalog Management
// ==========================================
http.route({
  path: "/admin/catalog",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const search = url.searchParams.get("q") ?? "";
    const tab = url.searchParams.get("tab") ?? "flowers";

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const flowers = await ctx.runQuery(api.admin.listAllFlowers, {
      search: search || undefined,
    });
    
    const gifts = await ctx.runQuery(api.admin.listAllGifts, {
      search: search || undefined,
    });

    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const flowerCards = flowers.map((f: any) => `
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:flex;flex-direction:column;">
        ${f.imageUrl ? `<img src="${esc(f.imageUrl)}" style="width:100%;height:180px;object-fit:cover;" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%239ca3af%22>No image</text></svg>'\" />` : '<div style="width:100%;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;">Немає фото</div>'}
        <div style="padding:14px;flex:1;display:flex;flex-direction:column;">
          <div style="font-weight:700;color:#111827;margin-bottom:4px;">${esc(f.name)}</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">${esc(f.nameUk || "")}</div>
          <div style="font-weight:700;color:#4f46e5;margin-bottom:8px;">${f.price} kr</div>
          <div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">${esc(f.category || "")}</div>
          <div style="margin-top:auto;display:flex;gap:6px;">
            <a href="/admin/catalog/edit?p=${encodeURIComponent(pwd)}&id=${f._id}&type=flower" style="flex:1;padding:8px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;text-align:center;text-decoration:none;font-size:13px;">✏️ Редагувати</a>
            <form method="POST" action="/admin/catalog/delete" style="flex:1;">
              <input type="hidden" name="p" value="${esc(pwd)}" />
              <input type="hidden" name="id" value="${f._id}" />
              <input type="hidden" name="type" value="flower" />
              <button type="submit" style="width:100%;padding:8px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;" onclick="return confirm('Видалити цю квітку?')">🗑️</button>
            </form>
          </div>
        </div>
      </div>
    `).join("");

    const giftCards = gifts.map((g: any) => `
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:flex;flex-direction:column;">
        ${g.imageUrl ? `<img src="${esc(g.imageUrl)}" style="width:100%;height:180px;object-fit:cover;" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%239ca3af%22>No image</text></svg>'\" />` : '<div style="width:100%;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;">Немає фото</div>'}
        <div style="padding:14px;flex:1;display:flex;flex-direction:column;">
          <div style="font-weight:700;color:#111827;margin-bottom:4px;">${esc(g.name)}</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">${esc(g.nameUk || "")}</div>
          <div style="font-weight:700;color:#10b981;margin-bottom:8px;">${g.price} kr</div>
          <div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">${esc(g.category || "")}</div>
          <div style="margin-top:auto;display:flex;gap:6px;">
            <a href="/admin/catalog/edit?p=${encodeURIComponent(pwd)}&id=${g._id}&type=gift" style="flex:1;padding:8px;background:#10b981;color:#fff;border:none;border-radius:8px;font-weight:700;text-align:center;text-decoration:none;font-size:13px;">✏️ Редагувати</a>
            <form method="POST" action="/admin/catalog/delete" style="flex:1;">
              <input type="hidden" name="p" value="${esc(pwd)}" />
              <input type="hidden" name="id" value="${g._id}" />
              <input type="hidden" name="type" value="gift" />
              <button type="submit" style="width:100%;padding:8px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;" onclick="return confirm('Видалити цей подарунок?')">🗑️</button>
            </form>
          </div>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Каталог - Адмін</title>
  ${styles()}
  <style>
    .catalog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-top:16px;}
    .tab-btn{padding:12px 24px;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:15px;text-decoration:none;display:inline-block;}
    .tab-btn.active{background:#4f46e5;color:#fff;}
    .tab-btn:not(.active){background:#e5e7eb;color:#374151;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>🌸 Управління каталогом</h1>
      <div class="sub">Квіти: ${flowers.length} | Подарунки: ${gifts.length}</div>
      
      <div style="margin:16px 0;display:flex;gap:10px;flex-wrap:wrap;">
        <a href="/admin/catalog?p=${encodeURIComponent(pwd)}&tab=flowers" class="tab-btn ${tab === "flowers" ? "active" : ""}">🌹 Квіти (${flowers.length})</a>
        <a href="/admin/catalog?p=${encodeURIComponent(pwd)}&tab=gifts" class="tab-btn ${tab === "gifts" ? "active" : ""}">🎁 Подарунки (${gifts.length})</a>
      </div>
      
      <div class="toolbar">
        <form method="GET" action="/admin/catalog" style="display:flex;gap:10px;flex:1;">
          <input type="hidden" name="p" value="${esc(pwd)}" />
          <input type="hidden" name="tab" value="${esc(tab)}" />
          <input type="text" name="q" placeholder="Пошук..." value="${esc(search)}" style="flex:1;" />
          <button type="submit" style="padding:10px 20px;background:#4f46e5;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;">🔍</button>
        </form>
        <a href="/admin/catalog/add?p=${encodeURIComponent(pwd)}&type=${tab === "gifts" ? "gift" : "flower"}" style="padding:10px 20px;background:#10b981;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;">➕ Додати ${tab === "gifts" ? "подарунок" : "квітку"}</a>
      </div>
      
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
      </div>
    </div>

    <div class="catalog-grid">
      ${tab === "flowers" ? (flowerCards || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6b7280;">Немає квітів</div>') : (giftCards || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6b7280;">Немає подарунків</div>')}
    </div>
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Add flower/gift form
http.route({
  path: "/admin/catalog/add",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const type = url.searchParams.get("type") ?? "flower";

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    const backUrl = `/admin/catalog?p=${encodeURIComponent(pwd)}&tab=${type === "gift" ? "gifts" : "flowers"}`;
    const isGift = type === "gift";

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Додати ${isGift ? "подарунок" : "квітку"} - Адмін</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>➕ Додати ${isGift ? "подарунок" : "квітку"}</h1>
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
      </div>
    </div>

    <div class="card">
      <form method="POST" action="/admin/catalog/create">
        <input type="hidden" name="p" value="${esc(pwd)}" />
        <input type="hidden" name="type" value="${esc(type)}" />
        
        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Назва (EN) *</label>
          <input type="text" name="name" required style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" placeholder="Rose Bouquet" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Назва (UK)</label>
          <input type="text" name="nameUk" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" placeholder="Букет троянд" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Назва (SV)</label>
          <input type="text" name="nameSv" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" placeholder="Rosbukett" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Ціна (kr) *</label>
          <input type="number" name="price" required min="0" step="1" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" placeholder="299" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Категорія</label>
          <input type="text" name="category" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" placeholder="${isGift ? "chocolate, teddy, candle" : "roses, tulips, mixed"}" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">🖼️ URL фото</label>
          <input type="url" name="imageUrl" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" placeholder="https://example.com/image.jpg" />
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Вставте посилання на зображення (JPG, PNG)</div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Опис</label>
          <textarea name="description" rows="3" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;font-family:inherit;" placeholder="Опис товару..."></textarea>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:flex;align-items:center;gap:8px;font-weight:700;color:#111827;">
            <input type="checkbox" name="available" checked style="width:20px;height:20px;" />
            Доступний для замовлення
          </label>
        </div>

        <button type="submit" style="width:100%;padding:14px;background:${isGift ? "#10b981" : "#4f46e5"};color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">
          ✅ Створити ${isGift ? "подарунок" : "квітку"}
        </button>
      </form>
    </div>
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Create flower/gift
http.route({
  path: "/admin/catalog/create",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const type = String(form.get("type") ?? "flower");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    const data = {
      name: String(form.get("name") ?? ""),
      nameUk: String(form.get("nameUk") ?? "") || undefined,
      nameSv: String(form.get("nameSv") ?? "") || undefined,
      price: parseInt(String(form.get("price") ?? "0")),
      category: String(form.get("category") ?? "") || undefined,
      imageUrl: String(form.get("imageUrl") ?? "") || undefined,
      description: String(form.get("description") ?? "") || undefined,
      available: form.get("available") === "on",
    };

    if (type === "gift") {
      await ctx.runMutation(api.admin.createGift, data);
    } else {
      await ctx.runMutation(api.admin.createFlower, data);
    }

    return redirect(`/admin/catalog?p=${encodeURIComponent(pwd)}&tab=${type === "gift" ? "gifts" : "flowers"}`);
  }),
});

// Edit flower/gift form
http.route({
  path: "/admin/catalog/edit",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const id = url.searchParams.get("id") ?? "";
    const type = url.searchParams.get("type") ?? "flower";

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    let item: any = null;
    if (type === "gift") {
      const gifts = await ctx.runQuery(api.admin.listAllGifts, {});
      item = gifts.find((g: any) => g._id === id);
    } else {
      const flowers = await ctx.runQuery(api.admin.listAllFlowers, {});
      item = flowers.find((f: any) => f._id === id);
    }

    if (!item) {
      return redirect(`/admin/catalog?p=${encodeURIComponent(pwd)}`);
    }

    const backUrl = `/admin/catalog?p=${encodeURIComponent(pwd)}&tab=${type === "gift" ? "gifts" : "flowers"}`;
    const uploadUrl = `/admin/catalog/upload?p=${encodeURIComponent(pwd)}&id=${id}&type=${type}`;
    const isGift = type === "gift";

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Редагувати ${isGift ? "подарунок" : "квітку"} - Адмін</title>
  ${styles()}
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>✏️ Редагувати: ${esc(item.name)}</h1>
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
      </div>
    </div>

    <div class="card">
      ${item.imageUrl ? `<img src="${esc(item.imageUrl)}" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin-bottom:16px;" />` : ""}
      
      <div style="margin-bottom:20px;padding:16px;background:#f0fdf4;border:2px solid #86efac;border-radius:12px;">
        <div style="font-weight:700;color:#166534;margin-bottom:8px;">📷 Фото товару</div>
        <a href="${uploadUrl}" style="display:inline-block;padding:12px 20px;background:#10b981;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
          📁 Завантажити з комп'ютера
        </a>
        <div style="font-size:12px;color:#6b7280;margin-top:8px;">Або вставте URL нижче</div>
      </div>
      
      <form method="POST" action="/admin/catalog/update">
        <input type="hidden" name="p" value="${esc(pwd)}" />
        <input type="hidden" name="id" value="${esc(id)}" />
        <input type="hidden" name="type" value="${esc(type)}" />
        
        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Назва (EN) *</label>
          <input type="text" name="name" required value="${esc(item.name)}" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Назва (UK)</label>
          <input type="text" name="nameUk" value="${esc(item.nameUk || "")}" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Назва (SV)</label>
          <input type="text" name="nameSv" value="${esc(item.nameSv || "")}" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Ціна (kr) *</label>
          <input type="number" name="price" required min="0" step="1" value="${item.price}" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Категорія</label>
          <input type="text" name="category" value="${esc(item.category || "")}" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" />
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">🔗 URL фото (альтернатива)</label>
          <input type="url" name="imageUrl" value="${esc(item.imageUrl || "")}" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;" />
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Або використайте кнопку вище для завантаження з комп'ютера</div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-weight:700;color:#111827;">Опис</label>
          <textarea name="description" rows="3" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:16px;font-family:inherit;">${esc(item.description || "")}</textarea>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:flex;align-items:center;gap:8px;font-weight:700;color:#111827;">
            <input type="checkbox" name="available" ${item.available ? "checked" : ""} style="width:20px;height:20px;" />
            Доступний для замовлення
          </label>
        </div>

        <button type="submit" style="width:100%;padding:14px;background:${isGift ? "#10b981" : "#4f46e5"};color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">
          💾 Зберегти зміни
        </button>
      </form>
    </div>
  </div>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Update flower/gift
http.route({
  path: "/admin/catalog/update",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const type = String(form.get("type") ?? "flower");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    const data: any = {
      name: String(form.get("name") ?? ""),
      nameUk: String(form.get("nameUk") ?? "") || undefined,
      nameSv: String(form.get("nameSv") ?? "") || undefined,
      price: parseInt(String(form.get("price") ?? "0")),
      category: String(form.get("category") ?? "") || undefined,
      imageUrl: String(form.get("imageUrl") ?? "") || undefined,
      description: String(form.get("description") ?? "") || undefined,
      available: form.get("available") === "on",
    };

    if (type === "gift") {
      await ctx.runMutation(api.admin.updateGift, { giftId: id as any, ...data });
    } else {
      await ctx.runMutation(api.admin.updateFlower, { flowerId: id as any, ...data });
    }

    return redirect(`/admin/catalog?p=${encodeURIComponent(pwd)}&tab=${type === "gift" ? "gifts" : "flowers"}`);
  }),
});

// Delete flower/gift
http.route({
  path: "/admin/catalog/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const type = String(form.get("type") ?? "flower");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    if (type === "gift") {
      await ctx.runMutation(api.admin.deleteGift, { giftId: id as any });
    } else {
      await ctx.runMutation(api.admin.deleteFlower, { flowerId: id as any });
    }

    return redirect(`/admin/catalog?p=${encodeURIComponent(pwd)}&tab=${type === "gift" ? "gifts" : "flowers"}`);
  }),
});

// ==========================================
// ADMIN: File Upload for Catalog
// ==========================================
http.route({
  path: "/admin/catalog/upload",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const id = url.searchParams.get("id") ?? "";
    const type = url.searchParams.get("type") ?? "flower";

    if (!checkPassword(pwd)) {
      return htmlResponse(loginPage());
    }

    let item: any = null;
    if (type === "gift") {
      const gifts = await ctx.runQuery(api.admin.listAllGifts, {});
      item = gifts.find((g: any) => g._id === id);
    } else {
      const flowers = await ctx.runQuery(api.admin.listAllFlowers, {});
      item = flowers.find((f: any) => f._id === id);
    }

    if (!item) {
      return redirect(`/admin/catalog?p=${encodeURIComponent(pwd)}`);
    }

    const backUrl = `/admin/catalog/edit?p=${encodeURIComponent(pwd)}&id=${id}&type=${type}`;
    const isGift = type === "gift";

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Завантажити фото - ${esc(item.name)}</title>
  ${styles()}
  <style>
    .upload-area{border:3px dashed #d1d5db;border-radius:16px;padding:40px;text-align:center;background:#f9fafb;cursor:pointer;transition:all 0.2s;}
    .upload-area:hover{border-color:#4f46e5;background:#eef2ff;}
    .upload-area.dragover{border-color:#10b981;background:#ecfdf5;}
    .preview{max-width:100%;max-height:300px;border-radius:12px;margin-top:16px;}
    .progress{width:100%;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin-top:16px;display:none;}
    .progress-bar{height:100%;background:#4f46e5;width:0%;transition:width 0.3s;}
    .status{margin-top:16px;padding:12px;border-radius:8px;display:none;}
    .status.success{display:block;background:#dcfce7;color:#166534;}
    .status.error{display:block;background:#fee2e2;color:#991b1b;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>📷 Завантажити фото</h1>
      <div class="sub">${esc(item.name)}</div>
      <div style="margin-top:16px;">
        <a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
      </div>
    </div>

    <div class="card">
      ${item.imageUrl ? `<div style="margin-bottom:16px;"><img src="${esc(item.imageUrl)}" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;" /><div style="text-align:center;margin-top:8px;color:#6b7280;font-size:13px;">Поточне фото</div></div>` : ""}
      
      <div class="upload-area" id="uploadArea">
        <div style="font-size:48px;margin-bottom:12px;">📁</div>
        <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:8px;">Натисніть або перетягніть фото сюди</div>
        <div style="color:#6b7280;font-size:14px;">JPG, PNG до 10MB</div>
        <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp" style="display:none;" />
      </div>

      <img id="preview" class="preview" style="display:none;" />
      
      <div class="progress" id="progress">
        <div class="progress-bar" id="progressBar"></div>
      </div>

      <div class="status" id="status"></div>

      <button id="uploadBtn" style="width:100%;padding:14px;background:${isGift ? "#10b981" : "#4f46e5"};color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;margin-top:16px;display:none;">
        ⬆️ Завантажити фото
      </button>
    </div>
  </div>

  <script>
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('preview');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const status = document.getElementById('status');
    const uploadBtn = document.getElementById('uploadBtn');
    
    let selectedFile = null;

    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
      if (!file.type.startsWith('image/')) {
        showStatus('Будь ласка, виберіть зображення (JPG, PNG)', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showStatus('Файл занадто великий (макс. 10MB)', 'error');
        return;
      }
      
      selectedFile = file;
      preview.src = URL.createObjectURL(file);
      preview.style.display = 'block';
      uploadBtn.style.display = 'block';
      status.style.display = 'none';
    }

    function showStatus(message, type) {
      status.textContent = message;
      status.className = 'status ' + type;
    }

    uploadBtn.addEventListener('click', async () => {
      if (!selectedFile) return;
      
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Завантаження...';
      progress.style.display = 'block';
      progressBar.style.width = '20%';

      try {
        // Step 1: Get upload URL
        const uploadUrlRes = await fetch('/admin/catalog/get-upload-url?p=${encodeURIComponent(pwd)}');
        const { uploadUrl } = await uploadUrlRes.json();
        progressBar.style.width = '40%';

        // Step 2: Upload file to Convex storage
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        });
        const { storageId } = await uploadRes.json();
        progressBar.style.width = '70%';

        // Step 3: Update the flower/gift with new image
        const updateRes = await fetch('/admin/catalog/update-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            p: '${esc(pwd)}',
            id: '${esc(id)}',
            type: '${esc(type)}',
            storageId: storageId,
          }),
        });
        
        progressBar.style.width = '100%';
        
        if (updateRes.ok) {
          showStatus('✅ Фото успішно завантажено! Перенаправлення...', 'success');
          setTimeout(() => {
            window.location.href = '/admin/catalog/edit?p=${encodeURIComponent(pwd)}&id=${id}&type=${type}';
          }, 1500);
        } else {
          throw new Error('Failed to update');
        }
      } catch (err) {
        showStatus('❌ Помилка завантаження: ' + err.message, 'error');
        uploadBtn.disabled = false;
        uploadBtn.textContent = '⬆️ Завантажити фото';
        progress.style.display = 'none';
      }
    });
  </script>
</body>
</html>`;

    return htmlResponse(html);
  }),
});

// Get upload URL for file upload
http.route({
  path: "/admin/catalog/get-upload-url",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();

    if (!checkPassword(pwd)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const uploadUrl = await ctx.runMutation(api.admin.generateUploadUrl, {});
    return json({ uploadUrl });
  }),
});

// Update image after upload
http.route({
  path: "/admin/catalog/update-image",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    const id = String(form.get("id") ?? "");
    const type = String(form.get("type") ?? "flower");
    const storageId = String(form.get("storageId") ?? "");

    if (!checkPassword(pwd)) {
      return new (globalThis as any).Response("Unauthorized", { status: 401 });
    }

    if (type === "gift") {
      await ctx.runMutation(api.admin.updateGiftImage, { 
        giftId: id as any, 
        storageId: storageId as any 
      });
    } else {
      await ctx.runMutation(api.admin.updateFlowerImage, { 
        flowerId: id as any, 
        storageId: storageId as any 
      });
    }

    return json({ success: true });
  }),
});

// ==========================================
// ADMIN: Promo Codes Management
// ==========================================
http.route({
  path: "/admin/promo",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const codes = await ctx.runQuery(api.admin.listPromoCodes, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const codesHtml = codes.map((c: any) => {
      const expired = c.expiresAt && c.expiresAt < Date.now();
      const maxed = c.maxUses && c.currentUses >= c.maxUses;
      return `
      <div class="card" style="${expired || maxed || !c.isActive ? 'opacity:0.6;' : ''}">
        <div class="cardTop">
          <div>
            <div class="title" style="font-family:monospace;letter-spacing:2px;">${esc(c.code)}</div>
            <div class="owner">${c.discountType === "percent" ? c.discountValue + "%" : c.discountValue + " kr"} знижка</div>
          </div>
          <div class="badge ${c.isActive && !expired && !maxed ? 'approved' : 'rejected'}">${c.isActive && !expired && !maxed ? 'Активний' : 'Неактивний'}</div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Використань</div><div class="v">${c.currentUses}${c.maxUses ? ' / ' + c.maxUses : ' / ∞'}</div></div>
          <div class="field"><div class="k">Мін. замовлення</div><div class="v">${c.minOrderAmount} kr</div></div>
          <div class="field"><div class="k">Закінчується</div><div class="v">${c.expiresAt ? formatDate(c.expiresAt) : 'Безстроково'}</div></div>
          <div class="field"><div class="k">Створено</div><div class="v">${formatDate(c.createdAt)}</div></div>
        </div>
        <div class="actions">
          <form method="POST" action="/admin/promo/toggle">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${c._id}" />
            <input type="hidden" name="active" value="${c.isActive ? 'false' : 'true'}" />
            <button type="submit" class="btn ${c.isActive ? 'btnReset' : 'btnApprove'}">${c.isActive ? '⏸️ Деактивувати' : '▶️ Активувати'}</button>
          </form>
          <form method="POST" action="/admin/promo/delete">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${c._id}" />
            <button type="submit" class="btn btnReject" onclick="return confirm('Видалити промокод?')">🗑️ Видалити</button>
          </form>
        </div>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Промокоди</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>🏷️ Управління промокодами</h1>
        <div class="sub">Всього промокодів: ${codes.length}</div>
        <div class="card" style="margin:16px 0;">
          <h3 style="margin-bottom:12px;">➕ Новий промокод</h3>
          <form method="POST" action="/admin/promo/create">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="text" name="code" placeholder="SUMMER20" required style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;text-transform:uppercase;" />
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <select name="discountType" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;">
                <option value="percent">% знижка</option>
                <option value="fixed">Фікс. знижка (kr)</option>
              </select>
              <input type="number" name="discountValue" placeholder="20" required min="1" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
            </div>
            <input type="number" name="minOrderAmount" placeholder="Мін. замовлення (kr)" value="0" min="0" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
            <input type="number" name="maxUses" placeholder="Макс. використань (пусто = безліміт)" min="1" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
            <button type="submit" class="btn btnApprove">✅ Створити</button>
          </form>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      ${codesHtml || '<div class="card"><div class="empty">📭 Немає промокодів</div></div>'}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

http.route({
  path: "/admin/promo/create",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.createPromoCode, {
      code: String(form.get("code") ?? ""),
      discountType: String(form.get("discountType") ?? "percent") as any,
      discountValue: parseFloat(String(form.get("discountValue") ?? "0")),
      minOrderAmount: parseInt(String(form.get("minOrderAmount") ?? "0")),
      maxUses: form.get("maxUses") ? parseInt(String(form.get("maxUses"))) : undefined,
    });
    return redirect(`/admin/promo?p=${encodeURIComponent(pwd)}`);
  }),
});

http.route({
  path: "/admin/promo/toggle",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.updatePromoCode, {
      promoCodeId: String(form.get("id")) as any,
      isActive: String(form.get("active")) === "true",
    });
    return redirect(`/admin/promo?p=${encodeURIComponent(pwd)}`);
  }),
});

http.route({
  path: "/admin/promo/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.deletePromoCode, { promoCodeId: String(form.get("id")) as any });
    return redirect(`/admin/promo?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: FAQ Management
// ==========================================
http.route({
  path: "/admin/faq",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const faqs = await ctx.runQuery(api.admin.listFAQ, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const faqsHtml = faqs.map((f: any) => `
      <div class="card">
        <div class="cardTop">
          <div>
            <div class="title">${esc(f.question)}</div>
            <div class="owner">${esc(f.category)} • ${esc(f.language)} ${f.active ? '' : '• (вимкнено)'}</div>
          </div>
          <div class="badge ${f.active ? 'approved' : 'rejected'}">${f.active ? 'Активне' : 'Вимкнене'}</div>
        </div>
        <div class="field" style="margin-top:8px;"><div class="k">Відповідь</div><div class="v">${esc(f.answer)}</div></div>
        <div class="actions">
          <form method="POST" action="/admin/faq/toggle">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${f._id}" />
            <input type="hidden" name="active" value="${f.active ? 'false' : 'true'}" />
            <button type="submit" class="btn ${f.active ? 'btnReset' : 'btnApprove'}">${f.active ? '⏸️ Вимкнути' : '▶️ Увімкнути'}</button>
          </form>
          <form method="POST" action="/admin/faq/delete">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${f._id}" />
            <button type="submit" class="btn btnReject" onclick="return confirm('Видалити?')">🗑️ Видалити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>FAQ</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>❓ Управління FAQ</h1>
        <div class="sub">Всього питань: ${faqs.length}</div>
        <div class="card" style="margin:16px 0;">
          <h3 style="margin-bottom:12px;">➕ Нове питання</h3>
          <form method="POST" action="/admin/faq/create">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="text" name="question" placeholder="Питання" required style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
            <textarea name="answer" placeholder="Відповідь" required rows="3" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;font-size:14px;"></textarea>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <input type="text" name="category" placeholder="Категорія" value="general" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
              <select name="language" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;">
                <option value="uk">Українська</option>
                <option value="en">English</option>
                <option value="sv">Svenska</option>
              </select>
            </div>
            <button type="submit" class="btn btnApprove">✅ Додати</button>
          </form>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      ${faqsHtml || '<div class="card"><div class="empty">📭 Немає FAQ</div></div>'}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

http.route({
  path: "/admin/faq/create",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.createFAQ, {
      question: String(form.get("question") ?? ""),
      answer: String(form.get("answer") ?? ""),
      category: String(form.get("category") ?? "general"),
      language: String(form.get("language") ?? "uk") as any,
    });
    return redirect(`/admin/faq?p=${encodeURIComponent(pwd)}`);
  }),
});

http.route({
  path: "/admin/faq/toggle",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.updateFAQ, {
      faqId: String(form.get("id")) as any,
      active: String(form.get("active")) === "true",
    });
    return redirect(`/admin/faq?p=${encodeURIComponent(pwd)}`);
  }),
});

http.route({
  path: "/admin/faq/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.deleteFAQ, { faqId: String(form.get("id")) as any });
    return redirect(`/admin/faq?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Subscriptions Management
// ==========================================
http.route({
  path: "/admin/subscriptions",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const status = url.searchParams.get("status") ?? "";
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const subs = await ctx.runQuery(api.admin.listSubscriptions, { status: status || undefined });
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const planLabel: Record<string, string> = { weekly: "Щотижня", biweekly: "Раз на 2 тижні", monthly: "Щомісяця" };
    const statusBadge = (s: string) => {
      const c: Record<string, string> = { active: "background:#dcfce7;color:#166534", paused: "background:#fef3c7;color:#92400e", cancelled: "background:#fee2e2;color:#991b1b" };
      return `<span style="padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;${c[s] || ''}">${s}</span>`;
    };

    const subsHtml = subs.map((s: any) => `
      <div class="card">
        <div class="cardTop">
          <div>
            <div class="title">${esc(s.buyerName || s.buyerEmail || "Невідомий")}</div>
            <div class="owner">${esc(s.recipientName)} • ${planLabel[s.plan] || s.plan}</div>
          </div>
          <div>${statusBadge(s.status)}</div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Бюджет</div><div class="v">${s.budget} kr</div></div>
          <div class="field"><div class="k">Наступна доставка</div><div class="v">${esc(s.nextDeliveryDate)}</div></div>
          <div class="field"><div class="k">Адреса</div><div class="v">${esc(s.deliveryAddress)}</div></div>
          <div class="field"><div class="k">Флорист</div><div class="v">${esc(s.floristName || "Не призначено")}</div></div>
          ${s.flowerPreferences ? `<div class="field" style="grid-column:1/-1;"><div class="k">Побажання</div><div class="v">${esc(s.flowerPreferences)}</div></div>` : ""}
        </div>
        <div class="actions">
          <form method="POST" action="/admin/subscriptions/status">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${s._id}" />
            <select name="status" style="padding:10px;border:2px solid #e5e7eb;border-radius:8px;width:100%;margin-bottom:8px;">
              <option value="active" ${s.status === "active" ? "selected" : ""}>Активна</option>
              <option value="paused" ${s.status === "paused" ? "selected" : ""}>Пауза</option>
              <option value="cancelled" ${s.status === "cancelled" ? "selected" : ""}>Скасована</option>
            </select>
            <button type="submit" class="btn btnApprove">✅ Оновити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Підписки на доставку</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>🔄 Підписки на доставку</h1>
        <div class="sub">Всього підписок: ${subs.length}</div>
        <div class="toolbar">
          <form method="GET" action="/admin/subscriptions" style="display:flex;gap:10px;">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <select name="status" onchange="this.form.submit()">
              <option value="">Всі</option>
              <option value="active" ${status === "active" ? "selected" : ""}>Активні</option>
              <option value="paused" ${status === "paused" ? "selected" : ""}>На паузі</option>
              <option value="cancelled" ${status === "cancelled" ? "selected" : ""}>Скасовані</option>
            </select>
          </form>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      ${subsHtml || '<div class="card"><div class="empty">📭 Немає підписок</div></div>'}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

http.route({
  path: "/admin/subscriptions/status",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.updateSubscriptionStatus, {
      subscriptionId: String(form.get("id")) as any,
      status: String(form.get("status")) as any,
    });
    return redirect(`/admin/subscriptions?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Push Notifications
// ==========================================
http.route({
  path: "/admin/push",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const tokenStats = await ctx.runQuery(api.admin.listPushTokens, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Push-сповіщення</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>🔔 Push-сповіщення</h1>
        <div class="sub">Статистика та надсилання повідомлень</div>
        <div class="stats">
          <div class="stat"><div class="statNum">${tokenStats.totalTokens}</div><div class="statLabel">Всього токенів</div></div>
          <div class="stat"><div class="statNum">${tokenStats.buyerTokens}</div><div class="statLabel">Покупці</div></div>
          <div class="stat"><div class="statNum">${tokenStats.floristTokens}</div><div class="statLabel">Флористи</div></div>
          <div class="stat"><div class="statNum">${tokenStats.iosTokens}</div><div class="statLabel">iOS</div></div>
          <div class="stat"><div class="statNum">${tokenStats.androidTokens}</div><div class="statLabel">Android</div></div>
        </div>
        <div class="card" style="margin:16px 0;">
          <h3 style="margin-bottom:12px;">📤 Надіслати push-повідомлення</h3>
          <p style="color:#6b7280;font-size:13px;margin-bottom:12px;">Для масового надсилання push-сповіщень використовуйте сторінку <a href="/admin/messages?p=${encodeURIComponent(pwd)}" style="color:#4f46e5;font-weight:700;">Системні повідомлення</a>. Там ви можете створити повідомлення, обрати аудиторію та надіслати.</p>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a>
        <a href="/admin/messages?p=${encodeURIComponent(pwd)}" style="padding:10px 20px;background:#8b5cf6;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;margin-left:8px;">📬 Повідомлення</a></div>
      </div>
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

// ==========================================
// ADMIN: Florist Stories Moderation
// ==========================================
http.route({
  path: "/admin/stories",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const includeExpired = url.searchParams.get("expired") === "1";
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const stories = await ctx.runQuery(api.admin.listFloristStories, { includeExpired });
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const storiesHtml = stories.map((s: any) => `
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);${s.isExpired ? 'opacity:0.5;' : ''}">
        <img src="${esc(s.imageUrl)}" style="width:100%;height:250px;object-fit:cover;" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/></svg>'" />
        <div style="padding:12px;">
          <div style="font-weight:700;color:#111827;">${esc(s.floristName || "Невідомий")}</div>
          ${s.caption ? `<div style="font-size:13px;color:#6b7280;margin:4px 0;">${esc(s.caption)}</div>` : ''}
          <div style="font-size:11px;color:#9ca3af;">${formatDate(s.createdAt)} ${s.isExpired ? '• Прострочене' : ''}</div>
          <form method="POST" action="/admin/stories/delete" style="margin-top:8px;">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${s._id}" />
            <button type="submit" style="width:100%;padding:8px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;" onclick="return confirm('Видалити цю сторіс?')">🗑️ Видалити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Сторіс флористів</title>${styles()}<style>.stories-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-top:16px;}</style></head><body><div class="wrap">
      <div class="top">
        <h1>📸 Сторіс флористів</h1>
        <div class="sub">Всього сторіс: ${stories.length}</div>
        <div class="toolbar">
          <a href="/admin/stories?p=${encodeURIComponent(pwd)}${includeExpired ? '' : '&expired=1'}" style="padding:10px 20px;background:${includeExpired ? '#4f46e5' : '#e5e7eb'};color:${includeExpired ? '#fff' : '#374151'};border-radius:12px;text-decoration:none;font-weight:700;">${includeExpired ? '🔍 Показано всі' : '🔍 Показати прострочені'}</a>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      <div class="stories-grid">
        ${storiesHtml || '<div class="card" style="grid-column:1/-1;"><div class="empty">📭 Немає сторіс</div></div>'}
      </div>
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

http.route({
  path: "/admin/stories/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.deleteFloristStory, { storyId: String(form.get("id")) as any });
    return redirect(`/admin/stories?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Delivery Zones
// ==========================================
http.route({
  path: "/admin/zones",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const zones = await ctx.runQuery(api.admin.listDeliveryZones, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const zonesHtml = zones.map((z: any) => `
      <div class="card">
        <div class="cardTop">
          <div>
            <div class="title">${esc(z.name)}</div>
            <div class="owner">${esc(z.country)}${z.city ? ' • ' + esc(z.city) : ''}</div>
          </div>
          <div class="badge ${z.active ? 'approved' : 'rejected'}">${z.active ? 'Активна' : 'Вимкнена'}</div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Радіус</div><div class="v">${z.radiusKm} км</div></div>
          <div class="field"><div class="k">Вартість доставки</div><div class="v">${z.deliveryFee} kr</div></div>
          <div class="field"><div class="k">Мін. замовлення</div><div class="v">${z.minOrderAmount ?? '—'} kr</div></div>
        </div>
        <div class="actions">
          <form method="POST" action="/admin/zones/toggle">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${z._id}" />
            <input type="hidden" name="active" value="${z.active ? 'false' : 'true'}" />
            <button type="submit" class="btn ${z.active ? 'btnReset' : 'btnApprove'}">${z.active ? '⏸️ Вимкнути' : '▶️ Увімкнути'}</button>
          </form>
          <form method="POST" action="/admin/zones/delete">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${z._id}" />
            <button type="submit" class="btn btnReject" onclick="return confirm('Видалити зону?')">🗑️ Видалити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Зони доставки</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>🗺️ Зони доставки</h1>
        <div class="sub">Всього зон: ${zones.length}</div>
        <div class="card" style="margin:16px 0;">
          <h3 style="margin-bottom:12px;">➕ Нова зона</h3>
          <form method="POST" action="/admin/zones/create">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="text" name="name" placeholder="Назва зони (напр. Центр Стокгольм)" required style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <select name="country" required style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;">
                <option value="SE">Швеція</option>
                <option value="UA">Україна</option>
                <option value="PL">Польща</option>
              </select>
              <input type="text" name="city" placeholder="Місто (опціонально)" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <input type="number" name="radiusKm" placeholder="Радіус (км)" required min="1" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
              <input type="number" name="deliveryFee" placeholder="Вартість (kr)" required min="0" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
              <input type="number" name="minOrderAmount" placeholder="Мін. замовлення (kr)" min="0" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
            </div>
            <button type="submit" class="btn btnApprove">✅ Створити</button>
          </form>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      ${zonesHtml || '<div class="card"><div class="empty">📭 Немає зон доставки</div></div>'}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

http.route({
  path: "/admin/zones/create",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.createDeliveryZone, {
      name: String(form.get("name") ?? ""),
      country: String(form.get("country") ?? "SE"),
      city: String(form.get("city") ?? "") || undefined,
      radiusKm: parseInt(String(form.get("radiusKm") ?? "10")),
      deliveryFee: parseInt(String(form.get("deliveryFee") ?? "50")),
      minOrderAmount: form.get("minOrderAmount") ? parseInt(String(form.get("minOrderAmount"))) : undefined,
    });
    return redirect(`/admin/zones?p=${encodeURIComponent(pwd)}`);
  }),
});

http.route({
  path: "/admin/zones/toggle",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.updateDeliveryZone, {
      zoneId: String(form.get("id")) as any,
      active: String(form.get("active")) === "true",
    });
    return redirect(`/admin/zones?p=${encodeURIComponent(pwd)}`);
  }),
});

http.route({
  path: "/admin/zones/delete",
  method: "POST",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const form = await req.formData();
    const pwd = String(form.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
    await ctx.runMutation(api.admin.deleteDeliveryZone, { zoneId: String(form.get("id")) as any });
    return redirect(`/admin/zones?p=${encodeURIComponent(pwd)}`);
  }),
});

// ==========================================
// ADMIN: Real-time Dashboard
// ==========================================
http.route({
  path: "/admin/realtime",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const metrics = await ctx.runQuery(api.admin.getRealtimeMetrics, {});
    const fraud = await ctx.runQuery(api.admin.getFraudAlerts, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const topFloristsHtml = metrics.topFlorists.map((f: any) => `
      <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #e5e7eb;">
        <span style="font-weight:600;">${esc(f.name)}</span>
        <span>${f.ordersToday} замовлень • ${f.revenue.toFixed(0)} kr</span>
      </div>
    `).join("");

    const fraudHtml = fraud.map((a: any) => `
      <div style="padding:12px;background:${a.severity === 'high' ? '#fee2e2' : a.severity === 'medium' ? '#fef3c7' : '#f3f4f6'};border-radius:8px;margin-bottom:8px;">
        <div style="font-weight:700;color:${a.severity === 'high' ? '#991b1b' : '#92400e'};">${esc(a.type)}</div>
        <div style="font-size:13px;color:#374151;">${esc(a.description)}</div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Дашборд реального часу</title>${styles()}
    <meta http-equiv="refresh" content="30">
    </head><body><div class="wrap">
      <div class="top">
        <h1>⚡ Дашборд реального часу</h1>
        <div class="sub">Автооновлення кожні 30 сек</div>
        <div class="stats">
          <div class="stat" style="background:linear-gradient(135deg,#fee2e2,#fecaca);border-color:#fca5a5;"><div class="statNum" style="color:#991b1b;">${metrics.ordersInProgress}</div><div class="statLabel">Замовлень в процесі</div></div>
          <div class="stat"><div class="statNum">${metrics.ordersLastHour}</div><div class="statLabel">Замовлень за годину</div></div>
          <div class="stat" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-color:#86efac;"><div class="statNum" style="color:#166534;">${metrics.revenue24h.toFixed(0)} kr</div><div class="statLabel">Дохід за 24г</div></div>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      <div class="card"><div class="title">🏆 Топ флористів сьогодні</div>${topFloristsHtml || '<div class="empty">Немає замовлень сьогодні</div>'}</div>
      ${fraud.length > 0 ? `<div class="card"><div class="title">🚨 Сповіщення про шахрайство</div>${fraudHtml}</div>` : ''}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

// ==========================================
// ADMIN: Audit Logs
// ==========================================
http.route({
  path: "/admin/audit",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const action = url.searchParams.get("action") ?? "";
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const logs = await ctx.runQuery(api.admin.listAuditLogs, { action: action || undefined });
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const logsHtml = logs.map((l: any) => `
      <div style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #e5e7eb;align-items:flex-start;">
        <div style="min-width:140px;font-size:12px;color:#6b7280;">${formatDate(l.timestamp)}</div>
        <div style="min-width:120px;"><span style="padding:3px 8px;background:#e0e7ff;color:#3730a3;border-radius:6px;font-size:12px;font-weight:700;">${esc(l.action)}</span></div>
        <div style="flex:1;">
          <div style="font-weight:600;color:#111827;">${esc(l.entity)}${l.entityId ? ' #' + esc(l.entityId.slice(-6)) : ''}</div>
          ${l.details ? `<div style="font-size:13px;color:#6b7280;margin-top:2px;">${esc(l.details)}</div>` : ''}
        </div>
        <div style="font-size:12px;color:#9ca3af;">${esc(l.performedBy)}</div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Логи дій</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>📋 Логи дій</h1>
        <div class="sub">Останні ${logs.length} записів</div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      <div class="card">${logsHtml || '<div class="empty">📭 Немає записів</div>'}</div>
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

// ==========================================
// ADMIN: Banners Management
// ==========================================
http.route({
  path: "/admin/banners",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const banners = await ctx.runQuery(api.admin.listBanners, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const bannersHtml = banners.map((b: any) => `
      <div class="card" style="${!b.active ? 'opacity:0.6;' : ''}">
        <div class="cardTop">
          <div>
            <div class="title">${esc(b.title)}</div>
            <div class="owner">${esc(b.subtitle || '')} • Пріоритет: ${b.priority}</div>
          </div>
          <div class="badge ${b.active ? 'approved' : 'rejected'}">${b.active ? 'Активний' : 'Вимкнений'}</div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Аудиторія</div><div class="v">${esc(b.targetAudience)}</div></div>
          <div class="field"><div class="k">Країна</div><div class="v">${esc(b.country || 'Всі')}</div></div>
          ${b.imageUrl ? `<div class="field" style="grid-column:1/-1;"><img src="${esc(b.imageUrl)}" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;" /></div>` : ''}
        </div>
        <div class="actions">
          <form method="POST" action="/admin/banners/toggle">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${b._id}" />
            <input type="hidden" name="active" value="${b.active ? 'false' : 'true'}" />
            <button type="submit" class="btn ${b.active ? 'btnReset' : 'btnApprove'}">${b.active ? '⏸️ Вимкнути' : '▶️ Увімкнути'}</button>
          </form>
          <form method="POST" action="/admin/banners/delete">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="hidden" name="id" value="${b._id}" />
            <button type="submit" class="btn btnReject" onclick="return confirm('Видалити?')">🗑️ Видалити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Банери та акції</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>🎨 Банери та акції</h1>
        <div class="sub">Всього банерів: ${banners.length}</div>
        <div class="card" style="margin:16px 0;">
          <h3 style="margin-bottom:12px;">➕ Новий банер</h3>
          <form method="POST" action="/admin/banners/create">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="text" name="title" placeholder="Заголовок банера" required style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
            <input type="text" name="subtitle" placeholder="Підзаголовок (опціонально)" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
            <input type="url" name="imageUrl" placeholder="URL зображення" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <select name="targetAudience" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;">
                <option value="all">Всім</option>
                <option value="buyers">Покупцям</option>
                <option value="florists">Флористам</option>
              </select>
              <input type="number" name="priority" placeholder="Пріоритет (0-100)" value="0" min="0" max="100" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
            </div>
            <button type="submit" class="btn btnApprove">✅ Створити</button>
          </form>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      ${bannersHtml || '<div class="card"><div class="empty">📭 Немає банерів</div></div>'}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

http.route({ path: "/admin/banners/create", method: "POST", handler: httpAction(async (ctx: AnyCtx, req: any) => {
  const form = await req.formData(); const pwd = String(form.get("p") ?? "").trim();
  if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
  await ctx.runMutation(api.admin.createBanner, {
    title: String(form.get("title") ?? ""), subtitle: String(form.get("subtitle") ?? "") || undefined,
    imageUrl: String(form.get("imageUrl") ?? "") || undefined, targetAudience: String(form.get("targetAudience") ?? "all") as any,
    priority: parseInt(String(form.get("priority") ?? "0")),
  });
  return redirect(`/admin/banners?p=${encodeURIComponent(pwd)}`);
})});

http.route({ path: "/admin/banners/toggle", method: "POST", handler: httpAction(async (ctx: AnyCtx, req: any) => {
  const form = await req.formData(); const pwd = String(form.get("p") ?? "").trim();
  if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
  await ctx.runMutation(api.admin.updateBanner, { bannerId: String(form.get("id")) as any, active: String(form.get("active")) === "true" });
  return redirect(`/admin/banners?p=${encodeURIComponent(pwd)}`);
})});

http.route({ path: "/admin/banners/delete", method: "POST", handler: httpAction(async (ctx: AnyCtx, req: any) => {
  const form = await req.formData(); const pwd = String(form.get("p") ?? "").trim();
  if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
  await ctx.runMutation(api.admin.deleteBanner, { bannerId: String(form.get("id")) as any });
  return redirect(`/admin/banners?p=${encodeURIComponent(pwd)}`);
})});

// ==========================================
// ADMIN: Seasonal Events
// ==========================================
http.route({
  path: "/admin/events",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const events = await ctx.runQuery(api.admin.listSeasonalEvents, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const eventsHtml = events.map((e: any) => `
      <div class="card" style="${!e.active ? 'opacity:0.6;' : ''}">
        <div class="cardTop">
          <div><div class="title">${esc(e.name)}</div><div class="owner">${esc(e.eventDate)} • Нагадування за ${e.reminderDaysBefore} днів</div></div>
          <div class="badge ${e.active ? 'approved' : 'rejected'}">${e.active ? 'Активна' : 'Вимкнена'}</div>
        </div>
        <div class="grid">
          ${e.description ? `<div class="field" style="grid-column:1/-1;"><div class="k">Опис</div><div class="v">${esc(e.description)}</div></div>` : ''}
          <div class="field"><div class="k">Знижка</div><div class="v">${e.discountPercent ? e.discountPercent + '%' : '—'}</div></div>
        </div>
        <div class="actions">
          <form method="POST" action="/admin/events/toggle">
            <input type="hidden" name="p" value="${esc(pwd)}" /><input type="hidden" name="id" value="${e._id}" />
            <input type="hidden" name="active" value="${e.active ? 'false' : 'true'}" />
            <button type="submit" class="btn ${e.active ? 'btnReset' : 'btnApprove'}">${e.active ? '⏸️ Вимкнути' : '▶️ Увімкнути'}</button>
          </form>
          <form method="POST" action="/admin/events/delete">
            <input type="hidden" name="p" value="${esc(pwd)}" /><input type="hidden" name="id" value="${e._id}" />
            <button type="submit" class="btn btnReject" onclick="return confirm('Видалити?')">🗑️ Видалити</button>
          </form>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Сезонні події</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>🎄 Сезонні події</h1>
        <div class="sub">Всього подій: ${events.length}</div>
        <div class="card" style="margin:16px 0;">
          <h3 style="margin-bottom:12px;">➕ Нова подія</h3>
          <form method="POST" action="/admin/events/create">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <input type="text" name="name" placeholder="Назва (напр. День Валентина)" required style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
            <input type="text" name="description" placeholder="Опис" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:8px;" />
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <input type="date" name="eventDate" required style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
              <input type="number" name="discountPercent" placeholder="Знижка %" min="0" max="100" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
              <input type="number" name="reminderDaysBefore" placeholder="Днів до нагадування" value="3" min="1" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
            </div>
            <button type="submit" class="btn btnApprove">✅ Створити</button>
          </form>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      ${eventsHtml || '<div class="card"><div class="empty">📭 Немає подій</div></div>'}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

http.route({ path: "/admin/events/create", method: "POST", handler: httpAction(async (ctx: AnyCtx, req: any) => {
  const form = await req.formData(); const pwd = String(form.get("p") ?? "").trim();
  if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
  await ctx.runMutation(api.admin.createSeasonalEvent, {
    name: String(form.get("name") ?? ""), description: String(form.get("description") ?? "") || undefined,
    eventDate: String(form.get("eventDate") ?? ""), discountPercent: form.get("discountPercent") ? parseInt(String(form.get("discountPercent"))) : undefined,
    reminderDaysBefore: parseInt(String(form.get("reminderDaysBefore") ?? "3")),
  });
  return redirect(`/admin/events?p=${encodeURIComponent(pwd)}`);
})});

http.route({ path: "/admin/events/toggle", method: "POST", handler: httpAction(async (ctx: AnyCtx, req: any) => {
  const form = await req.formData(); const pwd = String(form.get("p") ?? "").trim();
  if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
  await ctx.runMutation(api.admin.updateSeasonalEvent, { eventId: String(form.get("id")) as any, active: String(form.get("active")) === "true" });
  return redirect(`/admin/events?p=${encodeURIComponent(pwd)}`);
})});

http.route({ path: "/admin/events/delete", method: "POST", handler: httpAction(async (ctx: AnyCtx, req: any) => {
  const form = await req.formData(); const pwd = String(form.get("p") ?? "").trim();
  if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
  await ctx.runMutation(api.admin.deleteSeasonalEvent, { eventId: String(form.get("id")) as any });
  return redirect(`/admin/events?p=${encodeURIComponent(pwd)}`);
})});

// ==========================================
// ADMIN: Referral Program
// ==========================================
http.route({
  path: "/admin/referrals",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const referrals = await ctx.runQuery(api.admin.listReferrals, {});
    const settings = await ctx.runQuery(api.admin.getReferralSettings, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const refsHtml = referrals.map((r: any) => `
      <div class="card">
        <div class="cardTop">
          <div><div class="title">${esc(r.referrerName || r.referrerEmail || 'Невідомий')}</div><div class="owner">Код: ${esc(r.referralCode)}</div></div>
          <div class="badge ${r.status === 'completed' ? 'approved' : r.status === 'expired' ? 'rejected' : 'pending'}">${r.status}</div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Запрошений</div><div class="v">${esc(r.referredEmail || '—')}</div></div>
          <div class="field"><div class="k">Бонус</div><div class="v">${r.bonusAmount} kr ${r.bonusPaid ? '✅' : '⏳'}</div></div>
          <div class="field"><div class="k">Створено</div><div class="v">${formatDate(r.createdAt)}</div></div>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Реферальна програма</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>🤝 Реферальна програма</h1>
        <div class="stats">
          <div class="stat"><div class="statNum">${settings.totalReferrals}</div><div class="statLabel">Всього рефералів</div></div>
          <div class="stat" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-color:#86efac;"><div class="statNum" style="color:#166534;">${settings.completedReferrals}</div><div class="statLabel">Завершених</div></div>
          <div class="stat"><div class="statNum">${settings.totalBonusPaid} kr</div><div class="statLabel">Виплачено бонусів</div></div>
          <div class="stat"><div class="statNum">${settings.bonusAmount} kr</div><div class="statLabel">Бонус за реферал</div></div>
        </div>
        <div class="card" style="margin:16px 0;">
          <h3 style="margin-bottom:12px;">⚙️ Налаштування</h3>
          <form method="POST" action="/admin/referrals/settings">
            <input type="hidden" name="p" value="${esc(pwd)}" />
            <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
              <label style="font-weight:700;"><input type="checkbox" name="enabled" ${settings.enabled ? 'checked' : ''} /> Увімкнена</label>
              <input type="number" name="bonusAmount" value="${settings.bonusAmount}" min="1" placeholder="Бонус (kr)" style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;" />
              <button type="submit" class="btn btnApprove" style="width:auto;padding:10px 20px;">💾 Зберегти</button>
            </div>
          </form>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      ${refsHtml || '<div class="card"><div class="empty">📭 Немає рефералів</div></div>'}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

http.route({ path: "/admin/referrals/settings", method: "POST", handler: httpAction(async (ctx: AnyCtx, req: any) => {
  const form = await req.formData(); const pwd = String(form.get("p") ?? "").trim();
  if (!checkPassword(pwd)) return new (globalThis as any).Response("Unauthorized", { status: 401 });
  await ctx.runMutation(api.admin.updateReferralSettings, {
    enabled: form.get("enabled") === "on",
    bonusAmount: parseInt(String(form.get("bonusAmount") ?? "50")),
  });
  return redirect(`/admin/referrals?p=${encodeURIComponent(pwd)}`);
})});

// ==========================================
// ADMIN: SLA Monitoring
// ==========================================
http.route({
  path: "/admin/sla",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const sla = await ctx.runQuery(api.admin.getSlaMetrics, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const hourChart = sla.ordersByHour.map((h: any) => {
      const maxCount = Math.max(...sla.ordersByHour.map((x: any) => x.count), 1);
      const width = Math.round((h.count / maxCount) * 100);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <div style="min-width:30px;font-size:12px;color:#6b7280;text-align:right;">${h.hour}:00</div>
        <div style="flex:1;height:16px;background:#f3f4f6;border-radius:4px;overflow:hidden;"><div style="width:${width}%;height:100%;background:#4f46e5;border-radius:4px;"></div></div>
        <div style="min-width:30px;font-size:12px;color:#374151;font-weight:600;">${h.count}</div>
      </div>`;
    }).join("");

    const slowHtml = sla.slowFlorists.map((f: any) => `
      <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #e5e7eb;">
        <span style="font-weight:600;">${esc(f.name)}</span>
        <span style="color:#991b1b;font-weight:700;">${f.avgHours}г середнє (${f.orders} замовлень)</span>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SLA Моніторинг</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>⏱️ SLA Моніторинг</h1>
        <div class="sub">Якість та швидкість сервісу</div>
        <div class="stats">
          <div class="stat"><div class="statNum">${sla.avgDeliveryTimeHours}г</div><div class="statLabel">Середній час доставки</div></div>
          <div class="stat" style="background:${sla.onTimeRate >= 80 ? 'linear-gradient(135deg,#dcfce7,#bbf7d0)' : 'linear-gradient(135deg,#fee2e2,#fecaca)'};border-color:${sla.onTimeRate >= 80 ? '#86efac' : '#fca5a5'};"><div class="statNum" style="color:${sla.onTimeRate >= 80 ? '#166534' : '#991b1b'};">${sla.onTimeRate}%</div><div class="statLabel">Вчасних доставок</div></div>
          <div class="stat"><div class="statNum">${sla.totalDelivered}</div><div class="statLabel">Доставлено</div></div>
          <div class="stat"><div class="statNum">${sla.avgConfirmTimeMinutes} хв</div><div class="statLabel">Час підтвердження</div></div>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      <div class="card"><div class="title">📊 Замовлення по годинах</div><div style="padding:12px;">${hourChart}</div></div>
      ${sla.slowFlorists.length > 0 ? `<div class="card"><div class="title">🐢 Повільні флористи (> 4г SLA)</div>${slowHtml}</div>` : ''}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

// ==========================================
// ADMIN: Florist Rating Alerts
// ==========================================
http.route({
  path: "/admin/ratings",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const alerts = await ctx.runQuery(api.admin.getFloristRatingAlerts, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const alertsHtml = alerts.map((a: any) => `
      <div class="card" style="border-left:4px solid ${a.avgRating < 2 ? '#ef4444' : a.avgRating < 3 ? '#f59e0b' : '#6b7280'};">
        <div class="cardTop">
          <div><div class="title">${esc(a.name)}</div><div class="owner">${esc(a.email || '')} • ${esc(a.city || '')}</div></div>
          <div style="text-align:right;">
            <div style="font-size:24px;font-weight:900;color:${a.avgRating < 2 ? '#ef4444' : a.avgRating < 3 ? '#f59e0b' : '#6b7280'};">${a.avgRating}/5</div>
            <div style="font-size:12px;color:#6b7280;">${a.reviewCount} відгуків</div>
          </div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Тренд</div><div class="v">${a.recentTrend === 'improving' ? '📈 Покращується' : a.recentTrend === 'declining' ? '📉 Погіршується' : '➡️ Стабільний'}</div></div>
          <div class="field"><div class="k">Останній відгук</div><div class="v">${a.lastReviewDate ? formatDate(a.lastReviewDate) : '—'}</div></div>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Рейтинг флористів</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>⚠️ Рейтинг флористів</h1>
        <div class="sub">Флористи з рейтингом нижче 3.5 (${alerts.length})</div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      ${alertsHtml || '<div class="card"><div class="empty">✅ Всі флористи мають хороший рейтинг!</div></div>'}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

// ==========================================
// ADMIN: Cohort Analysis
// ==========================================
http.route({
  path: "/admin/cohorts",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const cohort = await ctx.runQuery(api.admin.getCohortAnalysis, {});
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Когортний аналіз</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>📈 Когортний аналіз</h1>
        <div class="sub">Утримання покупців та LTV</div>
        <div class="stats">
          <div class="stat"><div class="statNum">${cohort.repeatOrderRate}%</div><div class="statLabel">Повторні замовлення</div></div>
          <div class="stat"><div class="statNum">${cohort.avgOrdersPerBuyer}</div><div class="statLabel">Замовлень на покупця</div></div>
          <div class="stat" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-color:#86efac;"><div class="statNum" style="color:#166534;">${cohort.avgLifetimeValue} kr</div><div class="statLabel">LTV (середній)</div></div>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      <div class="card">
        <div class="title">📊 Когорти по місяцях</div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;margin-top:12px;">
            <thead><tr style="background:#f3f4f6;">
              <th style="padding:10px;text-align:left;font-size:13px;">Місяць</th>
              <th style="padding:10px;text-align:right;font-size:13px;">Нових покупців</th>
            </tr></thead>
            <tbody>
              ${cohort.monthlyCohorts.map((c: any) => `<tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px;font-weight:600;">${esc(c.month)}</td>
                <td style="padding:10px;text-align:right;">${c.newBuyers}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

// ==========================================
// ADMIN: Florist Reports
// ==========================================
http.route({
  path: "/admin/reports",
  method: "GET",
  handler: httpAction(async (ctx: AnyCtx, req: any) => {
    const URLCtor = (globalThis as any).URL;
    const url = new URLCtor(req.url);
    const pwd = (url.searchParams.get("p") ?? "").trim();
    const period = (url.searchParams.get("period") ?? "month") as any;
    if (!checkPassword(pwd)) return htmlResponse(loginPage());

    const reports = await ctx.runQuery(api.admin.getFloristReports, { period });
    const backUrl = `/admin?p=${encodeURIComponent(pwd)}`;

    const periodLinks = ["week", "month", "year"].map(p => {
      const isActive = p === period;
      return `<a href="/admin/reports?p=${encodeURIComponent(pwd)}&period=${p}" class="${isActive ? "active" : ""}">${p === "week" ? "Тиждень" : p === "month" ? "Місяць" : "Рік"}</a>`;
    }).join("");

    const reportsHtml = reports.map((r: any) => `
      <div class="card">
        <div class="cardTop">
          <div><div class="title">${esc(r.name)}</div><div class="owner">${esc(r.email || '')} • ${esc(r.city || '')}, ${esc(r.country || '')}</div></div>
          <div style="text-align:right;"><div style="font-size:20px;font-weight:900;color:#4f46e5;">${r.totalRevenue} kr</div><div style="font-size:12px;color:#6b7280;">${r.totalOrders} замовлень</div></div>
        </div>
        <div class="grid">
          <div class="field"><div class="k">Доставлено</div><div class="v">${r.deliveredOrders}</div></div>
          <div class="field"><div class="k">Скасовано</div><div class="v">${r.cancelledOrders}</div></div>
          <div class="field"><div class="k">Комісія платформи</div><div class="v">${r.platformCommission} kr</div></div>
          <div class="field"><div class="k">Заробіток флориста</div><div class="v" style="color:#166534;font-weight:900;">${r.floristEarnings} kr</div></div>
          <div class="field"><div class="k">Рейтинг</div><div class="v">${r.avgRating > 0 ? r.avgRating + '/5 ⭐ (' + r.reviewCount + ')' : '—'}</div></div>
        </div>
      </div>
    `).join("");

    const totalRevenue = reports.reduce((s: number, r: any) => s + r.totalRevenue, 0);
    const totalCommission = reports.reduce((s: number, r: any) => s + r.platformCommission, 0);

    const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Звіти флористів</title>${styles()}</head><body><div class="wrap">
      <div class="top">
        <h1>📊 Звіти по флористах</h1>
        <div class="sub">Флористів з замовленнями: ${reports.length}</div>
        <div class="tabs" style="margin:16px 0;">${periodLinks}</div>
        <div class="stats">
          <div class="stat"><div class="statNum">${totalRevenue} kr</div><div class="statLabel">Загальний дохід</div></div>
          <div class="stat" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-color:#86efac;"><div class="statNum" style="color:#166534;">${totalCommission} kr</div><div class="statLabel">Комісія платформи</div></div>
        </div>
        <div style="margin-top:16px;"><a href="${backUrl}" style="padding:10px 20px;background:#6b7280;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">← Назад</a></div>
      </div>
      ${reportsHtml || '<div class="card"><div class="empty">📭 Немає даних</div></div>'}
    </div></body></html>`;
    return htmlResponse(html);
  }),
});

// ==========================================
// CHECKOUT: Success & Cancel pages (Stripe redirect)
// ==========================================

// ==========================================
// PUBLIC: Privacy Policy & Terms
// ==========================================
// Stripe Connect return pages
http.route({
  path: "/stripe/connect/success",
  method: "GET",
  handler: httpAction(async () => {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Stripe Connected - Blomm Daya</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f9fafb;color:#111827}
    .wrap{max-width:720px;margin:0 auto;padding:28px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px}
    h1{margin:0 0 10px 0;font-size:24px}
    p{line-height:1.55;color:#374151}
    a.btn{display:inline-block;margin-top:14px;padding:12px 14px;border-radius:12px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:800}
    .muted{margin-top:10px;color:#6b7280;font-size:13px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Stripe connected</h1>
      <p>Your Stripe onboarding is complete. You can return to the app.</p>
      <a class="btn" href="daya://florist/payments">Open Blomm Daya</a>
      <div class="muted">If the app doesn't open automatically, close this page and go back to the app.</div>
    </div>
  </div>
</body>
</html>`;
    return htmlResponse(html);
  }),
});

http.route({
  path: "/stripe/connect/refresh",
  method: "GET",
  handler: httpAction(async () => {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Stripe Setup - Blomm Daya</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f9fafb;color:#111827}
    .wrap{max-width:720px;margin:0 auto;padding:28px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px}
    h1{margin:0 0 10px 0;font-size:24px}
    p{line-height:1.55;color:#374151}
    a.btn{display:inline-block;margin-top:14px;padding:12px 14px;border-radius:12px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:800}
    .muted{margin-top:10px;color:#6b7280;font-size:13px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Continue Stripe setup</h1>
      <p>Return to the app and tap "Connect Stripe" again to generate a new onboarding link.</p>
      <a class="btn" href="daya://florist/payments">Open Blomm Daya</a>
      <div class="muted">If the app doesn't open automatically, close this page and go back to the app.</div>
    </div>
  </div>
</body>
</html>`;
    return htmlResponse(html);
  }),
});

http.route({
  path: "/privacy",
  method: "GET",
  handler: httpAction(async () => {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Privacy Policy - Blomm Daya</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f9fafb;color:#111827}
    .wrap{max-width:900px;margin:0 auto;padding:28px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px}
    h1{margin:0 0 10px 0;font-size:28px}
    h2{margin:18px 0 8px 0;font-size:18px}
    p,li{line-height:1.55;color:#374151}
    .muted{color:#6b7280;font-size:13px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Privacy Policy</h1>
      <div class="muted">Last updated: ${new Date().toISOString().slice(0,10)}</div>

      <h2>1. Data we collect</h2>
      <ul>
        <li>Account data: email, name, phone number (if provided).</li>
        <li>Order data: delivery address, order contents, order history.</li>
        <li>Device data: push notification tokens and basic device identifiers for reminders/notifications.</li>
      </ul>

      <h2>2. How we use data</h2>
      <ul>
        <li>To process and fulfill your orders.</li>
        <li>To provide customer support.</li>
        <li>To send service notifications (order status, reminders).</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>We do not sell your personal data. We may share necessary data with service providers (e.g. payment processors) to complete transactions.</p>

      <h2>4. Your choices</h2>
      <ul>
        <li>You can disable notifications in app settings.</li>
        <li>You can request data deletion by contacting support.</li>
      </ul>

      <h2>5. Contact</h2>
      <p>If you have questions, contact: nkbygg@hotmail.com</p>
    </div>
  </div>
</body>
</html>`;
    return htmlResponse(html);
  }),
});

http.route({
  path: "/terms",
  method: "GET",
  handler: httpAction(async () => {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Terms of Service - Blomm Daya</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f9fafb;color:#111827}
    .wrap{max-width:900px;margin:0 auto;padding:28px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px}
    h1{margin:0 0 10px 0;font-size:28px}
    h2{margin:18px 0 8px 0;font-size:18px}
    p,li{line-height:1.55;color:#374151}
    .muted{color:#6b7280;font-size:13px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Terms of Service</h1>
      <div class="muted">Last updated: ${new Date().toISOString().slice(0,10)}</div>

      <h2>1. Service</h2>
      <p>Blomm Daya helps users browse and order flowers and related gifts from participating florists.</p>

      <h2>2. Accounts</h2>
      <p>You are responsible for maintaining the confidentiality of your account and for all activities that occur under it.</p>

      <h2>3. Orders & payments</h2>
      <p>Payments are processed by third-party payment providers. Delivery details are shared with the selected florist to fulfill the order.</p>

      <h2>4. Refunds</h2>
      <p>Refunds are handled according to applicable law and florist policies.</p>

      <h2>5. Contact</h2>
      <p>Support: nkbygg@hotmail.com</p>
    </div>
  </div>
</body>
</html>`;
    return htmlResponse(html);
  }),
});

export default http;