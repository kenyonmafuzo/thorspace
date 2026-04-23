"use client";
// app/admin/(protected)/news/NewsClient.jsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./news.module.css";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function NewsClient({ news, total, page, adminId }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const totalPages = Math.ceil(total / 20);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, published }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ error: data.error }); return; }
      setMsg({ ok: "Notícia criada!" });
      setTitle(""); setBody(""); setPublished(false); setShowForm(false);
      router.refresh();
    } catch { setMsg({ error: "Erro de conexão" }); }
    finally { setLoading(false); }
  }

  async function togglePublish(id, current) {
    await fetch("/api/admin/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, published: !current }),
    });
    router.refresh();
  }

  async function deleteNews(id) {
    if (!confirm("Apagar esta notícia?")) return;
    await fetch("/api/admin/news", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Notícias</h1>
        <button className={styles.newBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancelar" : "+ Nova notícia"}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>Nova notícia</h2>
          {msg?.error && <p className={styles.error}>{msg.error}</p>}
          {msg?.ok    && <p className={styles.success}>{msg.ok}</p>}

          <label className={styles.label}>
            Título
            <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} required disabled={loading} />
          </label>
          <label className={styles.label}>
            Conteúdo
            <textarea className={styles.textarea} value={body} onChange={e => setBody(e.target.value)} required disabled={loading} rows={5} />
          </label>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} disabled={loading} />
            Publicar imediatamente
          </label>
          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Salvando…" : "Criar notícia"}
          </button>
        </form>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Título</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Publicado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {news.length === 0 && <tr><td colSpan={5} className={styles.empty}>Sem notícias ainda.</td></tr>}
            {news.map(n => (
              <tr key={n.id}>
                <td className={styles.titleCell}>{n.title}</td>
                <td>
                  <span className={`${styles.badge} ${n.published ? styles.published : styles.draft}`}>
                    {n.published ? "Publicado" : "Rascunho"}
                  </span>
                </td>
                <td>{formatDate(n.created_at)}</td>
                <td>{formatDate(n.published_at)}</td>
                <td className={styles.actions}>
                  <button className={styles.actionBtn} onClick={() => togglePublish(n.id, n.published)}>
                    {n.published ? "Despublicar" : "Publicar"}
                  </button>
                  <button className={styles.deleteBtn} onClick={() => deleteNews(n.id)}>Apagar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 && <button className={styles.pageBtn} onClick={() => router.push(`/admin/news?page=${page - 1}`)}>← Anterior</button>}
          <span className={styles.pageInfo}>Página {page} / {totalPages}</span>
          {page < totalPages && <button className={styles.pageBtn} onClick={() => router.push(`/admin/news?page=${page + 1}`)}>Próxima →</button>}
        </div>
      )}
    </div>
  );
}
