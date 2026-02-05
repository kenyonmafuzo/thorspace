import { supabase } from "@/lib/supabase";

export async function POST(request) {
  const { userId, username } = await request.json();
  console.log("[API] username recebido:", username);

  if (!userId || !username) {
    return new Response(JSON.stringify({ error: "Missing userId or username" }), { status: 400 });
  }

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    username: username.trim(),
    avatar_preset: "normal",
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[API] Erro ao criar profile:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
