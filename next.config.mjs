/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Rule 1: All paths — security + cache headers.
        source: "/(.*)",
        headers: [
          // --- Cache control ---
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma",        value: "no-cache" },
          { key: "Expires",       value: "0" },

          // --- Security headers ---
          // Prevent clickjacking
          { key: "X-Frame-Options",          value: "SAMEORIGIN" },
          // Stop MIME-type sniffing
          { key: "X-Content-Type-Options",   value: "nosniff" },
          // Legacy XSS protection (IE/old browsers)
          { key: "X-XSS-Protection",         value: "1; mode=block" },
          // HTTPS enforcement (2 years, include subdomains)
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Limit referrer information sent cross-origin
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          // Restrict access to browser APIs
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // Don't expose server tech details
          { key: "X-Powered-By",              value: "" },
        ],
      },
      {
        // Rule 2: /_next/static — content-hashed assets, safe to cache forever.
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
