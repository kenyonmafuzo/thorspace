import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * DELETE /api/account/delete
 * Body: { confirmation: "DELETE" }
 * Authorization: Bearer <access_token>
 *
 * Deleta completamente a conta do usuário autenticado:
 * - chat_messages, friend_requests, inbox, matches, match_results,
 *   match_events, player_progress, player_stats, profiles
 * - auth user (via service role)
 */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin config ausente");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function DELETE(request) {
  try {
    // 1. Verificar autenticação via JWT do usuário
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const accessToken = authHeader.slice(7);

    // Validar token com client anon
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: userData, error: authError } = await anonClient.auth.getUser(accessToken);
    if (authError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;

    // 2. Confirmar intenção ("DELETE")
    const body = await request.json().catch(() => ({}));
    if (body?.confirmation !== "DELETE") {
      return NextResponse.json({ error: "Confirmação inválida" }, { status: 400 });
    }

    const admin = getAdminClient();

    // 3. Deletar todos os dados do usuário nas tabelas de aplicação
    const deletions = [
      admin.from("chat_messages").delete().eq("user_id", userId),
      admin.from("inbox").delete().eq("user_id", userId),
      admin.from("player_progress").delete().eq("user_id", userId),
      admin.from("player_stats").delete().eq("user_id", userId),
      admin.from("friend_requests").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      admin.from("matches").delete().or(`player1_id.eq.${userId},player2_id.eq.${userId}`),
    ];

    // match_results e match_events podem não existir dependendo do schema
    try {
      await admin.from("match_results").delete().or(`winner_id.eq.${userId},loser_id.eq.${userId}`);
    } catch (_) {}
    try {
      await admin.from("match_events").delete().eq("user_id", userId);
    } catch (_) {}

    const results = await Promise.allSettled(deletions);
    const failures = results.filter(r => r.status === "rejected" || r.value?.error);
    if (failures.length > 0) {
      console.warn("[DELETE ACCOUNT] Algumas tabelas falharam:", failures.map(f => f.reason?.message || f.value?.error?.message));
    }

    // 4. Deletar profile por último (FK constraint)
    await admin.from("profiles").delete().eq("id", userId);

    // 5. Deletar o usuário no auth (requer service role)
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("[DELETE ACCOUNT] Erro ao deletar auth user:", deleteAuthError.message);
      return NextResponse.json({ error: "Erro ao deletar usuário auth" }, { status: 500 });
    }

    console.log(`[DELETE ACCOUNT] ✅ Conta deletada — user: ${userId}`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[DELETE ACCOUNT] Exceção:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
