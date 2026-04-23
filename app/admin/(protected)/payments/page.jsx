// app/admin/(protected)/payments/page.jsx
import { getPayments } from "@/lib/admin/adminData";
import Link from "next/link";
import styles from "./payments.module.css";

export const dynamic = "force-dynamic";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function PaymentsPage({ searchParams }) {
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;
  const status = sp?.status ?? "";

  const { payments, total } = await getPayments({ page, limit: 30, status });
  const totalPages = Math.ceil(total / 30);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Pagamentos</h1>
        <span className={styles.total}>{total.toLocaleString("pt-BR")} registros</span>
      </div>

      <div className={styles.tabs}>
        {[
          { key: "",         label: "Todos" },
          { key: "paid",     label: "Pagos" },
          { key: "failed",   label: "Falhos" },
          { key: "refunded", label: "Estornados" },
          { key: "pending",  label: "Pendentes" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/payments?status=${key}`}
            className={`${styles.tab} ${status === key ? styles.tabActive : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Usuário</th>
              <th>Provedor</th>
              <th>Valor</th>
              <th>Método</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr><td colSpan={6} className={styles.empty}>Sem registros.</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.paid_at ?? p.created_at)}</td>
                <td className={styles.mono}>{p.user_id ?? "—"}</td>
                <td><span className={styles.badge}>{p.provider}</span></td>
                <td className={styles.amount}>{p.currency} {Number(p.amount).toFixed(2)}</td>
                <td>{p.payment_method ?? "—"}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[`s_${p.status}`]}`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 && <Link className={styles.pageBtn} href={`/admin/payments?status=${status}&page=${page - 1}`}>← Anterior</Link>}
          <span className={styles.pageInfo}>Página {page} / {totalPages}</span>
          {page < totalPages && <Link className={styles.pageBtn} href={`/admin/payments?status=${status}&page=${page + 1}`}>Próxima →</Link>}
        </div>
      )}
    </div>
  );
}
