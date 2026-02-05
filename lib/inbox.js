// inbox.js
// Funções utilitárias para registrar mensagens de inbox para usuários
import { supabase } from "@/lib/supabase";

// Cria uma mensagem de inbox para um usuário
export async function createInboxMessage({ user_id, type, content, cta, cta_url, lang = "pt", title, meta }) {
  const row = { 
    user_id, 
    type, 
    content, 
    cta, 
    cta_url, 
    lang, 
    created_at: new Date().toISOString()
  };
  
  // Adicionar campos opcionais se fornecidos
  if (title !== undefined) row.title = title;
  if (meta !== undefined) row.meta = meta;
  
  return await supabase.from("inbox").insert([row]);
}

// Busca mensagens de inbox para um usuário
export async function fetchInboxMessages(user_id, lang = "pt") {
  return await supabase
    .from("inbox")
    .select("id, type, content, cta, cta_url, created_at, lang")
    .eq("user_id", user_id)
    .eq("lang", lang)
    .order("created_at", { ascending: false });
}
