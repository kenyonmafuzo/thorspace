// middleware.js — Page view tracking + security bot blocking
// Runs at the Edge for every matching request.
// Uses Vercel geo headers (no external API needed) and fires a non-blocking
// insert to Supabase REST API to record the page view.

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// SECURITY: Block automated scanners probing for sensitive files/endpoints.
// These paths have no legitimate use in this Next.js app and are exclusively
// accessed by vulnerability scanners and recon bots.
// ---------------------------------------------------------------------------
const SCANNER_PATTERNS = [
  // Environment / secrets files
  /\/\.env(\b|$|\/)/i,
  /\/(server|deploy|web|dist|core|build|services|src|app|config|public|backend|frontend|api|root|prod|stage|dev)\/\.env/i,
  /\/config\.env$/i,
  /\/\.env\.(local|production|staging|development|test)/i,
  // Deployment / infra files
  /\/(Procfile|Dockerfile|docker-compose\.ya?ml|\.dockerignore)$/i,
  /\/Makefile$/i,
  // Backup / leaked config files
  /\.(bak|backup|old|orig|save|swp|swo|~)$/i,
  /\/(wp-config|configuration|settings|database|db|credentials)\.(php|php\.bak|xml|yml|yaml|json\.bak)/i,
  // PHP / legacy CMS scanners
  /\/(info\.php|phpinfo\.php|php\.php|shell\.php|b374k|c99|r57|webshell)/i,
  /\/(wp-admin|wp-login|wp-includes|xmlrpc\.php)/i,
  // Debug / diagnostics endpoints
  /\/debug\//i,
  /\/(trace\.axd|elmah\.axd|webresource\.axd)/i,
  // Spring Boot / Java actuator
  /\/actuator(\/|$)/i,
  // Vite / bundler dev-server leaks
  /\/@vite\/env/i,
  /\/\.git(\/|$)/i,
  // API / swagger recon
  /\/(swagger|api-docs|openapi)(\/|$)/i,
  /\/v[0-9]+\/(api-docs|_catalog)(\/|$)/i,
  // Server status / metrics
  /\/(server-status|server-info|nginx_status|health)(\/|$)/i,
  // Other common probe paths
  /\/(exec|eval|cmd|shell|console|terminal)(\/|$)/i,
];

// ---------------------------------------------------------------------------
// Paths to ignore for page-view tracking (admin, api, static files, etc.)
// ---------------------------------------------------------------------------
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
  const { pathname, hostname } = request.nextUrl;

  // Block scanner / recon bot requests — return 404 (not 403, to avoid
  // confirming the endpoint exists to the scanner).
  if (SCANNER_PATTERNS.some((re) => re.test(pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  // Skip non-page requests (tracking only)
  if (IGNORE.test(pathname)) return NextResponse.next();

  // Skip localhost — never count developer visits
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return NextResponse.next();
  }

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|woff2?|ttf|css|js)$).*)",
  ],
};
