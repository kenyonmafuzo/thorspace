// app/api/admin/auth/login/route.js
import { NextResponse } from "next/server";
import { adminLogin, ADMIN_COOKIE } from "@/lib/admin/adminAuth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown";
    const userAgent = request.headers.get("user-agent") ?? "";

    const result = await adminLogin({ email, password, ip, userAgent });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({ admin: result.admin });
    response.cookies.set(ADMIN_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 3600,
    });
    return response;
  } catch (err) {
    console.error("[admin/login]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
