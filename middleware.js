// middleware.js — Page view tracking
// Runs at the Edge for every matching request.
// Uses Vercel geo headers (no external API needed) and fires a non-blocking
// insert to Supabase REST API to record the page view.

import { NextResponse } from "next/server";

// Paths to ignore: admin, api, static files, Next.js internals
const IGNORE = /^\/(admin|api|_next|favicon|icon|robots|sitemap|\.)/;

// Simple non-cryptographic fingerprint — just for same-session grouping.
// Uses btoa since SubtleCrypto is available but async; this avoids awaiting.
function makeVisitorId(ip, ua, date) {
  const raw = `${ip}|${ua}|${date}`;
  // btoa only handles ASCII — strip non-ASCII from ua
  const safe = raw.replace(/[^\x00-\x7F]/g, "");
  try { return btoa(safe).slice(0, 32); } catch { return "unknown"; }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip non-page requests
  if (IGNORE.test(pathname)) return NextResponse.next();

  // Extract tracking data from headers
  const h          = request.headers;
  const ip         = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua         = h.get("user-agent") ?? "";
  const country    = h.get("x-vercel-ip-country") ?? null;
  const city       = h.get("x-vercel-ip-city")    ?? null;
  const region     = h.get("x-vercel-ip-region")  ?? null;
  const referrer   = h.get("referer")              ?? null;
  const date       = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const visitorId  = makeVisitorId(ip, ua, date);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    // Fire-and-forget — do NOT await, the response is never used
    fetch(`${supabaseUrl}/rest/v1/page_views`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        path: pathname,
        visitor_id: visitorId,
        country,
        city,
        region,
        user_agent: ua.slice(0, 512), // cap at 512 chars
        referrer: referrer ? referrer.slice(0, 512) : null,
      }),
    }).catch(() => {}); // silently ignore any network error
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|woff2?|ttf|css|js)$).*)",
  ],
};
