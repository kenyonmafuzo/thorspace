// app/api/admin/vip/grant/route.js
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/adminAuth";
import { grantVip } from "@/lib/admin/adminData";

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { userId, durationDays, plan, reason } = await request.json();
    if (!userId || !durationDays) return NextResponse.json({ error: "userId e durationDays obrigatórios" }, { status: 400 });

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const result = await grantVip({ userId, durationDays: Number(durationDays), plan, adminUserId: session.id, reason, ip });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin/vip/grant]", err);
    return NextResponse.json({ error: err.message ?? "Erro interno" }, { status: 500 });
  }
}
