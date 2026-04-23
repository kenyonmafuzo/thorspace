"use client";
// components/admin/AdminSidebar.jsx

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AdminSidebar.module.css";

const NAV = [
  { href: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
  { href: "/admin/users",     icon: "👥", label: "Usuários" },
  { href: "/admin/vip",       icon: "⭐", label: "VIP" },
  { href: "/admin/payments",  icon: "💳", label: "Pagamentos" },
  { href: "/admin/analytics", icon: "📊", label: "Analytics" },
  { href: "/admin/news",      icon: "📰", label: "Notícias" },
  { href: "/admin/assets",    icon: "🎮", label: "Assets" },
  { href: "/admin/audit",     icon: "📋", label: "Auditoria" },
];

export default function AdminSidebar({ admin }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>⚡</span>
        <span className={styles.brandText}>Admin</span>
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.navItem} ${pathname.startsWith(href) ? styles.active : ""}`}
          >
            <span className={styles.navIcon}>{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.adminInfo}>
          <span className={styles.adminName}>{admin?.displayName ?? admin?.email}</span>
          <span className={styles.adminRole}>{admin?.role}</span>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Sair">
          ⏏
        </button>
      </div>
    </aside>
  );
}
