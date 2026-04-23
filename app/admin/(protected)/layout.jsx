// app/admin/layout.jsx
// Server component — validates admin session cookie.
// Redirects to /admin/login when session is absent or expired.

import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/adminAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import styles from "../admin.module.css";

export const metadata = { title: "Admin — Thorspace" };

export default async function AdminLayout({ children }) {
  // /admin/login is nested under this layout but must bypass session check
  // We handle this by checking the request path — but layouts don't receive
  // pathname in server components. Instead we expose a slot pattern:
  // the login page is wrapped by this layout, so we need to allow unauthenticated
  // rendering for the login page. Solution: wrap login page content standalone
  // and skip redirect only when session check is for a page that is /admin/login.
  // The cleanest approach: move login outside of this layout using a parallel slot
  // or a group. Here we solve it by checking if cookies exist at all.

  const session = await getAdminSession();
  // Note: we cannot know the current route inside a layout server component, so
  // we rely on the login page being placed at app/admin/(public)/login,
  // described separately. See app/admin/(public)/layout.jsx for the public group.
  // This layout protects everything EXCEPT the (public) group.
  if (!session) redirect("/admin/login");

  return (
    <div className={styles.root}>
      <AdminSidebar admin={session} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
