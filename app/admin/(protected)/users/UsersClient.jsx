"use client";
// app/admin/(protected)/users/UsersClient.jsx

import { useRouter } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import styles from "./users.module.css";

const LIMIT = 30;

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function VipBadge({ isVip, expiresAt }) {
  if (!isVip) return <span className={`${styles.statusBadge} ${styles.inactive}`}>—</span>;
  const expired = expiresAt && new Date(expiresAt) < new Date();
  return (
    <span className={`${styles.statusBadge} ${expired ? styles.expired : styles.active}`}>
      {expired ? "expirado" : `até ${formatDate(expiresAt)}`}
    </span>
  );
}

export default function UsersClient({ users, total, page, search: initSearch, filter: initFilter }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchVal, setSearchVal] = useState(initSearch);

  function navigate(params) {
    const sp = new URLSearchParams({ page: "1", search: searchVal, filter: initFilter, ...params });
    startTransition(() => router.push(`/admin/users?${sp.toString()}`));
  }

  const debounceRef = { current: null };
  function handleSearchChange(e) {
    const val = e.target.value;
    setSearchVal(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ search: val, page: "1" }), 400);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Usuários</h1>
        <span className={styles.total}>{total.toLocaleString("pt-BR")} registros</span>
      </div>

      <div className={styles.controls}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar por username, email ou nome…"
          value={searchVal}
          onChange={handleSearchChange}
        />
        <div className={styles.filters}>
          {["all", "vip", "non_vip"].map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${initFilter === f ? styles.filterActive : ""}`}
              onClick={() => navigate({ filter: f, page: "1" })}
            >
              {f === "all" ? "Todos" : f === "vip" ? "VIP" : "Não-VIP"}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Level</th>
              <th>VIP</th>
              <th>Plano</th>
              <th>Membro desde</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.empty}>Nenhum usuário encontrado.</td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className={isPending ? styles.dimmed : ""}>
                <td className={styles.username}>{u.username ?? "—"}</td>
                <td className={styles.email}>{u.email ?? "—"}</td>
                <td>{u.level ?? 1}</td>
                <td><VipBadge isVip={u.is_vip} expiresAt={u.vip_expires_at} /></td>
                <td>{u.vip_plan ?? "—"}</td>
                <td>{formatDate(u.created_at)}</td>
                <td>
                  <button
                    className={styles.viewBtn}
                    onClick={() => router.push(`/admin/users/${u.id}`)}
                  >
                    Ver →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => navigate({ page: String(page - 1) })}
          >
            ← Anterior
          </button>
          <span className={styles.pageInfo}>Página {page} / {totalPages}</span>
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => navigate({ page: String(page + 1) })}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
