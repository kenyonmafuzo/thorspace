import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * One-time admin endpoint to activate VIP for a username.
 * Usage: GET /api/admin/activate-vip?username=kenyon
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Missing ?username= parameter" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set in .env.local — add it and restart the dev server" },
      { status: 500 }
    );
  }

  // Admin client bypasses RLS
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Add columns if they don't exist (via SQL via RPC won't work with anon — use admin REST instead)
  //    Supabase doesn't allow DDL over the JS client directly, so we do it via raw SQL exec
  //    Fall back: just do the UPDATE and let the SELECT tell us if columns exist
  const { data: existCheck, error: existErr } = await admin
    .from("profiles")
    .select("id, username, is_vip, vip_expires_at")
    .eq("username", username)
    .maybeSingle();

  if (existErr) {
    return NextResponse.json({ error: `Profile fetch error: ${existErr.message}` }, { status: 500 });
  }

  if (!existCheck) {
    return NextResponse.json({ error: `No profile found with username '${username}'` }, { status: 404 });
  }

  // 2. Try to set VIP columns — attempt with vip_name_color too
  //    If the column doesn't exist yet we catch the error and retry without it
  let updateError = null;

  const fullUpdate = await admin
    .from("profiles")
    .update({
      is_vip: true,
      vip_expires_at: "2099-12-31T23:59:59+00:00",
      vip_name_color: "#FFD700",
      vip_frame_color: "#FFD700",
    })
    .eq("id", existCheck.id);

  updateError = fullUpdate.error;

  if (updateError && (updateError.code === "42703" || updateError.message?.includes("column"))) {
    // Columns don't exist yet — update only existing columns
    const basicUpdate = await admin
      .from("profiles")
      .update({ is_vip: true, vip_expires_at: "2099-12-31T23:59:59+00:00" })
      .eq("id", existCheck.id);
    updateError = basicUpdate.error;
  }

  if (updateError) {
    return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
  }

  // 3. Send inbox notification
  await admin.from("inbox").insert([{
    user_id: existCheck.id,
    type: "system",
    title: "Acesso VIP concedido.",
    content: "Sua presença na galáxia foi elevada.",
    cta: "VIP",
    cta_url: "/vip",
    lang: "pt",
    created_at: new Date().toISOString(),
  }]);

  // 4. Verify
  const { data: verified } = await admin
    .from("profiles")
    .select("id, username, is_vip, vip_expires_at, vip_name_color, vip_frame_color")
    .eq("id", existCheck.id)
    .single();

  return NextResponse.json({
    success: true,
    message: `✅ VIP activated for '${username}' until 2099`,
    profile: verified,
  });
}
