// app/api/admin/auth/session/route.js
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/adminAuth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ admin: null }, { status: 401 });
  return NextResponse.json({ admin: session });
}
