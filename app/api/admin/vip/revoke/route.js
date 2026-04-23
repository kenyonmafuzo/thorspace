// app/api/admin/vip/revoke/route.js
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/adminAuth";
import { revokeVip } from "@/lib/admin/adminData";

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { userId, reason } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    await revokeVip({ userId, adminUserId: session.id, reason, ip });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/vip/revoke]", err);
    return NextResponse.json({ error: err.message ?? "Erro interno" }, { status: 500 });
  }
}
