// app/admin/(protected)/assets/page.jsx
import { getAdminClient } from "@/lib/admin/adminClient";
import AssetsClient from "./AssetsClient";

export const dynamic = "force-dynamic";

async function getAssets({ page = 1, category = "" } = {}) {
  const db = getAdminClient();
  const offset = (page - 1) * 30;
  let query = db
    .from("game_assets")
    .select("id, name, slug, category, is_vip, is_active, sort_order, preview_url, created_at", { count: "exact" })
    .order("category")
    .order("sort_order")
    .range(offset, offset + 29);
  if (category) query = query.eq("category", category);
  const { data, count, error } = await query;
  if (error) throw error;
  return { assets: data ?? [], total: count ?? 0 };
}

export default async function AssetsPage({ searchParams }) {
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;
  const category = sp?.category ?? "";
  const { assets, total } = await getAssets({ page, category });
  return <AssetsClient assets={assets} total={total} page={page} category={category} />;
}
