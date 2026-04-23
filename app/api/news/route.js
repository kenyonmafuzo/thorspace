// app/api/news/route.js — public endpoint for published admin_news
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin/adminClient";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const delivery = searchParams.get("delivery"); // "notifications" | "game_updates" | "modal"
  const lang     = searchParams.get("lang");     // "pt" | "en" | "es" — omit for all

  try {
    const db = getAdminClient();
    let query = db
      .from("admin_news")
      .select("id, title, body, created_at, lang, show_as_login_modal, show_in_notifications, show_in_game_updates")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (delivery === "notifications") query = query.eq("show_in_notifications", true);
    else if (delivery === "game_updates")  query = query.eq("show_in_game_updates", true);
    else if (delivery === "modal")          query = query.eq("show_as_login_modal", true);

    // Filter by lang: return items for that lang OR items set to 'all'
    if (lang && lang !== "all") {
      query = query.or(`lang.eq.${lang},lang.eq.all`);
    }

    const { data, error } = await query.limit(50);
    if (error) throw error;

    return NextResponse.json({ news: data ?? [] });
  } catch (err) {
    return NextResponse.json({ news: [], error: err.message }, { status: 500 });
  }
}
