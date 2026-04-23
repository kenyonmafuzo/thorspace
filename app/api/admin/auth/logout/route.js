// app/api/admin/auth/logout/route.js
import { NextResponse } from "next/server";
import { adminLogout, ADMIN_COOKIE } from "@/lib/admin/adminAuth";

export async function POST(request) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (token) await adminLogout(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
