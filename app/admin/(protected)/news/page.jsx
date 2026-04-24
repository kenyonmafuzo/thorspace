// app/admin/(protected)/news/page.jsx
import { getAdminClient } from "@/lib/admin/adminClient";
import { getAdminSession } from "@/lib/admin/adminAuth";
import NewsClient from "./NewsClient";

export const dynamic = "force-dynamic";

async function getNews({ page = 1 } = {}) {
  const db = getAdminClient();
  const offset = (page - 1) * 20;

  // Try with meta column first; fall back without it if column doesn't exist yet
  let result = await db
    .from("admin_news")
    .select("id, title, body, published, published_at, show_as_login_modal, show_in_notifications, show_in_game_updates, lang, created_at, meta, admin_users(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + 19);

  if (result.error?.message?.includes("meta")) {
    // meta column not yet migrated — retry without it
    result = await db
      .from("admin_news")
      .select("id, title, body, published, published_at, show_as_login_modal, show_in_notifications, show_in_game_updates, lang, created_at, admin_users(display_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + 19);
  }

  if (result.error) throw result.error;
  return { news: result.data ?? [], total: result.count ?? 0 };
}

export default async function NewsPage({ searchParams }) {
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;
  const session = await getAdminSession();
  const { news, total } = await getNews({ page });
  return <NewsClient news={news} total={total} page={page} adminId={session?.id} />;
}
