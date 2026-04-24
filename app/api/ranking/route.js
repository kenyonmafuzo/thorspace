import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin/adminClient";

export async function GET() {
  try {
    const db = getAdminClient();
    const [{ data: profiles }, { data: statsData }, { data: progressData }] = await Promise.all([
      db.from("profiles").select("id, username, avatar_preset, is_vip, vip_name_color, vip_frame_color").order("username", { ascending: true }),
      db.from("player_stats").select("user_id, matches_played, wins, draws, losses, ships_destroyed"),
      db.from("player_progress").select("user_id, level, xp, xp_to_next, total_xp"),
    ]);
    return NextResponse.json({
      profiles: profiles || [],
      statsData: statsData || [],
      progressData: progressData || [],
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
