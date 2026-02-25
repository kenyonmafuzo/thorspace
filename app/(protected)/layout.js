// Force server-render on every request — prevents Vercel CDN / Chrome from
// caching stale HTML that causes the infinite-spinner on page refresh in Chrome.
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ProtectedClientLayout from "./ProtectedClientLayout";

export default function ProtectedLayout({ children }) {
  return <ProtectedClientLayout>{children}</ProtectedClientLayout>;
}
