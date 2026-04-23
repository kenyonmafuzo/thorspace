// app/admin/(protected)/vip/page.jsx
import { getVipList } from "@/lib/admin/adminData";
import Link from "next/link";
import styles from "./vip.module.css";

export const dynamic = "force-dynamic";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function VipPage({ searchParams }) {
  const sp = await searchParams;
  const status = sp?.status ?? "active";
  const page = Number(sp?.page) || 1;

  const { records, total } = await getVipList({ page, limit: 30, status });
  const totalPages = Math.ceil(total / 30);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>VIP</h1>
        <span className={styles.total}>{total.toLocaleString("pt-BR")} registros</span>
      </div>

      <div className={styles.tabs}>
        {["active", "inactive"].map((s) => (
          <Link
            key={s}
            href={`/admin/vip?status=${s}`}
            className={`${styles.tab} ${status === s ? styles.tabActive : ""}`}
          >
            {s === "active" ? "Ativos" : "Inativos"}
          </Link>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Plano</th>
              <th>Expira em</th>
              <th>Membro desde</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>Sem registros.</td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id}>
                <td className={styles.username}>{r.username ?? "—"}</td>
                <td className={styles.email}>{r.email ?? "—"}</td>
                <td>{r.vip_plan ?? "—"}</td>
                <td>{formatDate(r.vip_expires_at)}</td>
                <td>{formatDate(r.created_at)}</td>
                <td>
                  <Link className={styles.viewBtn} href={`/admin/users/${r.id}`}>
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 && <Link className={styles.pageBtn} href={`/admin/vip?status=${status}&page=${page - 1}`}>← Anterior</Link>}
          <span className={styles.pageInfo}>Página {page} / {totalPages}</span>
          {page < totalPages && <Link className={styles.pageBtn} href={`/admin/vip?status=${status}&page=${page + 1}`}>Próxima →</Link>}
        </div>
      )}
    </div>
  );
}
