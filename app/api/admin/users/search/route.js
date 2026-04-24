// app/api/admin/users/search/route.js
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/adminAuth";
import { getAdminClient } from "@/lib/admin/adminClient";

export async function GET(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [] });

  try {
    const db = getAdminClient();
    const { data, error } = await db
      .from("profiles")
      .select("id, username, avatar_preset")
      .ilike("username", `${q}%`)
      .limit(10);

    if (error) throw error;
    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
