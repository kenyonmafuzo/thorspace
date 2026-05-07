// lib/admin/analyticsData.js
// Analytics queries — all use service-role client.

import { getAdminClient } from "./adminClient";

const PERIODS = { "1d": 1, "7d": 7, "30d": 30 };

function startOf(days) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── Overview numbers ──────────────────────────────────────────────────────────
export async function getAnalyticsOverview(period = "7d") {
  const db   = getAdminClient();
  const days = PERIODS[period] ?? 7;
  const from = startOf(days);

  const [totalRes, uniqueRes, prevTotalRes] = await Promise.all([
    // Total views in period
    db.from("page_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", from),
    // Unique visitors in period (we count distinct visitor_id client-side from a small query)
    db.from("page_views")
      .select("visitor_id")
      .gte("created_at", from),
    // Total views in previous period (for % change)
    db.from("page_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOf(days * 2))
      .lt("created_at", from),
  ]);

  const totalViews   = totalRes.count ?? 0;
  const uniqueVisitors = new Set((uniqueRes.data ?? []).map(r => r.visitor_id).filter(Boolean)).size;
  const prevViews    = prevTotalRes.count ?? 0;
  const viewsChange  = prevViews > 0 ? Math.round(((totalViews - prevViews) / prevViews) * 100) : null;

  return { totalViews, uniqueVisitors, viewsChange };
}

// ── Daily breakdown (for chart) ───────────────────────────────────────────────
export async function getAnalyticsByDay(period = "7d") {
  const db   = getAdminClient();
  const days = PERIODS[period] ?? 7;
  const from = startOf(days);

  const { data } = await db
    .from("page_views")
    .select("created_at, visitor_id")
    .gte("created_at", from)
    .order("created_at");

  // Group by date
  const map = {};
  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10);
    if (!map[day]) map[day] = { views: 0, visitors: new Set() };
    map[day].views++;
    if (row.visitor_id) map[day].visitors.add(row.visitor_id);
  }

  // Fill in missing days
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      date: key,
      views: map[key]?.views ?? 0,
      visitors: map[key]?.visitors.size ?? 0,
    });
  }
  return result;
}

// ── Top pages ─────────────────────────────────────────────────────────────────
export async function getTopPages(period = "7d", limit = 10) {
  const db   = getAdminClient();
  const days = PERIODS[period] ?? 7;
  const from = startOf(days);

  const { data } = await db
    .from("page_views")
    .select("path")
    .gte("created_at", from);

  const count = {};
  for (const { path } of data ?? []) {
    count[path] = (count[path] ?? 0) + 1;
  }

  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path, views]) => ({ path, views }));
}

// ── Top countries ─────────────────────────────────────────────────────────────
export async function getTopCountries(period = "7d", limit = 10) {
  const db   = getAdminClient();
  const days = PERIODS[period] ?? 7;
  const from = startOf(days);

  const { data } = await db
    .from("page_views")
    .select("country")
    .gte("created_at", from)
    .not("country", "is", null);

  const count = {};
  for (const { country } of data ?? []) {
    count[country] = (count[country] ?? 0) + 1;
  }

  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([country, views]) => ({ country, views }));
}

// ── Browsers ──────────────────────────────────────────────────────────────────
function parseBrowser(ua) {
  if (!ua) return "Desconhecido";
  if (/Edg\//.test(ua))    return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  if (/MSIE|Trident/.test(ua)) return "IE";
  return "Outro";
}

// ── Device detection ──────────────────────────────────────────────────────────
function parseDeviceType(ua) {
  if (!ua) return "Desconhecido";
  if (/iPad/i.test(ua)) return "Tablet";
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return "Tablet";
  if (/Mobi|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(ua)) return "Mobile";
  return "Desktop";
}

function parseMobileModel(ua) {
  if (!ua) return "Desconhecido";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  const samsung = ua.match(/\b(SM-[A-Z0-9]+)\b/);
  if (samsung) return `Samsung ${samsung[1]}`;
  const pixel = ua.match(/\bPixel\s(\d+\s?(?:XL|Pro|a)?)\b/i);
  if (pixel) return `Pixel ${pixel[1].trim()}`;
  const xiaomi = ua.match(/\b(Redmi\s[\w+]|Mi\s\d+\w*|POCO\s\w+)\b/i);
  if (xiaomi) return xiaomi[1];
  const oneplus = ua.match(/\b(OnePlus\s\w+)\b/i);
  if (oneplus) return oneplus[1];
  const generic = ua.match(/;\s*([^;()\n]+?)\s+Build\//);
  if (generic) {
    const model = generic[1].trim();
    if (!/^(Linux|Android|U)$/.test(model)) return model;
  }
  return "Android";
}

export async function getDeviceStats(period = "7d") {
  const db   = getAdminClient();
  const days = PERIODS[period] ?? 7;
  const from = startOf(days);

  const { data } = await db
    .from("page_views")
    .select("user_agent")
    .gte("created_at", from);

  let mobile = 0, desktop = 0, tablet = 0;
  const modelCount = {};

  for (const { user_agent } of data ?? []) {
    const type = parseDeviceType(user_agent);
    if (type === "Mobile") {
      mobile++;
      const model = parseMobileModel(user_agent);
      modelCount[model] = (modelCount[model] ?? 0) + 1;
    } else if (type === "Tablet") {
      tablet++;
      const model = parseMobileModel(user_agent);
      modelCount[model] = (modelCount[model] ?? 0) + 1;
    } else {
      desktop++;
    }
  }

  const topMobileModels = Object.entries(modelCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([model, views]) => ({ model, views }));

  return { mobile, desktop, tablet, topMobileModels };
}

export async function getTopBrowsers(period = "7d") {
  const db   = getAdminClient();
  const days = PERIODS[period] ?? 7;
  const from = startOf(days);

  const { data } = await db
    .from("page_views")
    .select("user_agent")
    .gte("created_at", from);

  const count = {};
  for (const { user_agent } of data ?? []) {
    const b = parseBrowser(user_agent);
    count[b] = (count[b] ?? 0) + 1;
  }

  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .map(([browser, views]) => ({ browser, views }));
}

// ── Referrers ─────────────────────────────────────────────────────────────────
function parseReferrer(ref) {
  if (!ref) return "(direto)";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return ref.slice(0, 60);
  }
}

export async function getTopReferrers(period = "7d", limit = 10) {
  const db   = getAdminClient();
  const days = PERIODS[period] ?? 7;
  const from = startOf(days);

  const { data } = await db
    .from("page_views")
    .select("referrer")
    .gte("created_at", from);

  const count = {};
  for (const { referrer } of data ?? []) {
    const r = parseReferrer(referrer);
    count[r] = (count[r] ?? 0) + 1;
  }

  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([source, views]) => ({ source, views }));
}

// ── Recent visits (table) ─────────────────────────────────────────────────────
export async function getRecentViews(limit = 50) {
  const db = getAdminClient();
  const { data } = await db
    .from("page_views")
    .select("id, path, country, city, user_agent, referrer, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ── All in one (called by analytics server page) ──────────────────────────────
export async function getAnalyticsData(period = "7d") {
  const [overview, byDay, topPages, topCountries, browsers, referrers, recent, deviceStats] = await Promise.all([
    getAnalyticsOverview(period),
    getAnalyticsByDay(period),
    getTopPages(period),
    getTopCountries(period),
    getTopBrowsers(period),
    getTopReferrers(period),
    getRecentViews(30),
    getDeviceStats(period),
  ]);
  return { overview, byDay, topPages, topCountries, browsers, referrers, recent, deviceStats };
}
