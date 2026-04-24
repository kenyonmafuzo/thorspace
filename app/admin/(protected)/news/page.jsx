// app/admin/(protected)/news/page.jsx
import { getAdminClient } from "@/lib/admin/adminClient";
import { getAdminSession } from "@/lib/admin/adminAuth";
import NewsClient from "./NewsClient";

export const dynamic = "force-dynamic";

async function getNews({ page = 1 } = {}) {
  const db = getAdminClient();
  const offset = (page - 1) * 20;
  const { data, count, error } = await db
    .from("admin_news")
    .select("id, title, body, published, published_at, show_as_login_modal, show_in_notifications, show_in_game_updates, lang, created_at, meta, admin_users(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + 19);
  if (error) throw error;
  return { news: data ?? [], total: count ?? 0 };
}

export default async function NewsPage({ searchParams }) {
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;
  const session = await getAdminSession();
  const { news, total } = await getNews({ page });
  return <NewsClient news={news} total={total} page={page} adminId={session?.id} />;
}
