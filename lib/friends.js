// Deleta um pedido de amizade pendente (enviado)
export async function deleteFriendRequest(requestId) {
  return await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId);
}
// Remove a friendship between two users (delete accepted friend_requests in either direction)
export async function removeFriend(userId1, userId2) {
  // Remove both directions just in case
  const { error: error1 } = await supabase
    .from("friend_requests")
    .delete()
    .or(`and(from_user_id.eq.${userId1},to_user_id.eq.${userId2},status.eq.accepted),and(from_user_id.eq.${userId2},to_user_id.eq.${userId1},status.eq.accepted)`);
  return { error: error1 };
}
// Verifica relação de amizade entre dois usuários
export async function checkFriendRelationship(viewerId, playerId) {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .or(
      `and(from_user_id.eq.${viewerId},to_user_id.eq.${playerId}),and(from_user_id.eq.${playerId},to_user_id.eq.${viewerId})`
    )
    .in("status", ["pending", "accepted"]) // só status ativos
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}
// Busca perfis por array de ids
export async function fetchProfilesByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_preset")
    .in("id", ids);
  return { data, error };
}
// Lista todos os amigos do usuário (status accepted)
export async function fetchFriends(userId) {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .eq("status", "accepted");
  return { data, error };
}

// Lista pedidos recebidos (status pending, para o usuário)
export async function fetchIncomingRequests(userId) {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .eq("to_user_id", userId)
    .eq("status", "pending");
  return { data, error };
}

// Lista pedidos enviados (status pending, enviados pelo usuário)
export async function fetchSentRequests(userId) {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .eq("from_user_id", userId)
    .eq("status", "pending");
  return { data, error };
}
// Busca perfis pelo username (case-insensitive, prefixo)
export async function searchProfiles(query, limit = 50) {
  if (!query || typeof query !== "string" || !query.trim()) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_preset")
    .ilike("username", `${query.trim()}%`)
    .order("username", { ascending: true })
    .limit(limit);
  if (error) return [];
  return data || [];
}
import { supabase } from "@/lib/supabase";

// pega a relação (pending/accepted/declined) entre dois users
export async function fetchFriendRequest(viewerId, playerId) {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .or(
      `and(from_user_id.eq.${viewerId},to_user_id.eq.${playerId}),and(from_user_id.eq.${playerId},to_user_id.eq.${viewerId})`
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

export async function sendFriendRequest(viewerId, playerId) {
  return await supabase
    .from("friend_requests")
    .insert([{ from_user_id: viewerId, to_user_id: playerId, status: "pending" }]);
}

export async function acceptFriendRequest(requestId, viewerId) {
  // Aceita o pedido mudando status para 'accepted'
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", requestId)
    .eq("to_user_id", viewerId);
  return { error };
}

export async function declineFriendRequest(requestId, viewerId) {
  return await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId)
    .eq("to_user_id", viewerId);
}
