"use client";
// app/admin/(protected)/assets/AssetsClient.jsx

import { useRouter } from "next/navigation";
import styles from "./assets.module.css";

const CATEGORIES = ["", "background", "sound", "badge", "ship", "shot"];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AssetsClient({ assets, total, page, category }) {
  const router = useRouter();
  const totalPages = Math.ceil(total / 30);

  function navigate(params) {
    const sp = new URLSearchParams({ page: "1", category, ...params });
    router.push(`/admin/assets?${sp.toString()}`);
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Game Assets</h1>
        <span className={styles.total}>{total.toLocaleString("pt-BR")} registros</span>
      </div>

      <div className={styles.tabs}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`${styles.tab} ${category === c ? styles.tabActive : ""}`}
            onClick={() => navigate({ category: c, page: "1" })}
          >
            {c === "" ? "Todos" : c}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Slug</th>
              <th>Categoria</th>
              <th>VIP</th>
              <th>Ativo</th>
              <th>Ordem</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 && <tr><td colSpan={7} className={styles.empty}>Sem assets cadastrados.</td></tr>}
            {assets.map(a => (
              <tr key={a.id}>
                <td className={styles.name}>{a.name}</td>
                <td className={styles.slug}>{a.slug}</td>
                <td><span className={styles.catBadge}>{a.category}</span></td>
                <td>{a.is_vip ? <span className={styles.vip}>VIP</span> : "—"}</td>
                <td>
                  <span className={`${styles.statusBadge} ${a.is_active ? styles.active : styles.inactive}`}>
                    {a.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>{a.sort_order}</td>
                <td>{formatDate(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 && <button className={styles.pageBtn} onClick={() => navigate({ page: String(page - 1) })}>← Anterior</button>}
          <span className={styles.pageInfo}>Página {page} / {totalPages}</span>
          {page < totalPages && <button className={styles.pageBtn} onClick={() => navigate({ page: String(page + 1) })}>Próxima →</button>}
        </div>
      )}
    </div>
  );
}
