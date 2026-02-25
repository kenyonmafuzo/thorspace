/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Rule 1: All paths → no-store.
        // Prevents Chrome/Vercel CDN from caching HTML pages, which causes
        // the infinite-spinner-on-Ctrl+R bug in Chrome (Safari is unaffected).
        source: "/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma",        value: "no-cache" },
          { key: "Expires",       value: "0" },
        ],
      },
      {
        // Rule 2: /_next/static — content-hashed assets, safe to cache forever.
        // This rule is evaluated after Rule 1 and overrides it for this path.
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
