// app/admin/(protected)/audit/page.jsx
import { getAuditLogs } from "@/lib/admin/adminData";
import Link from "next/link";
import styles from "./audit.module.css";

export const dynamic = "force-dynamic";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function AuditPage({ searchParams }) {
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;

  const { logs, total } = await getAuditLogs({ page, limit: 50 });
  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Auditoria</h1>
        <span className={styles.total}>{total.toLocaleString("pt-BR")} entradas</span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Admin</th>
              <th>Ação</th>
              <th>Tipo</th>
              <th>Alvo</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={6} className={styles.empty}>Sem registros.</td></tr>
            )}
            {logs.map((l) => (
              <tr key={l.id}>
                <td className={styles.mono}>{formatDate(l.created_at)}</td>
                <td>{l.admin_users?.display_name ?? l.admin_users?.email ?? "—"}</td>
                <td><span className={styles.actionBadge}>{l.action}</span></td>
                <td>{l.target_type ?? "—"}</td>
                <td className={styles.mono}>{l.target_id ?? "—"}</td>
                <td className={styles.mono}>{l.ip_address ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 && <Link className={styles.pageBtn} href={`/admin/audit?page=${page - 1}`}>← Anterior</Link>}
          <span className={styles.pageInfo}>Página {page} / {totalPages}</span>
          {page < totalPages && <Link className={styles.pageBtn} href={`/admin/audit?page=${page + 1}`}>Próxima →</Link>}
        </div>
      )}
    </div>
  );
}
