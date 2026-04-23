// app/admin/layout.jsx
// Root admin layout — no auth check (applies to both public + protected groups).
// Auth is enforced by app/admin/(protected)/layout.jsx.

export const metadata = { title: "Admin — Thorspace" };

export default function AdminRootLayout({ children }) {
  return <>{children}</>;
}
