"use client";


"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  fetchFriends,
  fetchIncomingRequests,
  fetchSentRequests,
  fetchProfilesByIds,
  searchProfiles,
  checkFriendRelationship,
  removeFriend,
  deleteFriendRequest
} from "@/lib/friends";

import PlayerProfileModal from "@/app/components/PlayerProfileModal";
import { getAvatarSrc } from "@/app/lib/avatarOptions";
import { createInboxMessage } from "@/lib/inbox";
import { useI18n } from "@/src/hooks/useI18n";

const galaxyBg = (
  <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none" }} />
);
const pageContainerStyle = {
  width: "100%",
  minHeight: "100vh",
  background: "transparent",
  display: "flex",
  flexDirection: "column",
  paddingTop: 100,
  paddingLeft: 0,
  paddingRight: 0,
  alignItems: "center",
  position: "relative",
  zIndex: 1,
};
const topRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  flexWrap: "wrap",
  gap: 12,
  padding: "24px 24px 0 24px",
  width: "100%",
  maxWidth: 1100,
  margin: 0,
  boxSizing: "border-box",
  position: "relative",
  zIndex: 1,
};
const titleStyle = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  color: "#00E5FF",
  fontFamily: "'Orbitron',sans-serif",
  letterSpacing: 1,
  flexShrink: 0,
};
const searchInputStyle = {
  width: "100%",
  maxWidth: 280,
  minWidth: 160,
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #222',
  background: '#181c24',
  color: '#fff',
  fontSize: 16,
  boxSizing: "border-box",
  flexShrink: 1,
};
const tabsRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  margin: "18px 0 0 0",
  width: "100%",
  maxWidth: 1100,
  paddingLeft: 24,
  paddingRight: 24,
  boxSizing: "border-box",
};
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 352px))",
  gap: "22px",
  width: "100%",
  maxWidth: 1100,
  minWidth: 0,
  marginLeft: 0,
  marginRight: 0,
  alignItems: "start"
};

const gridContainerStyle = {
  width: "100%",
  maxWidth: 1100,
  minWidth: 0,
  paddingLeft: 24,
  paddingRight: 24,
  boxSizing: "border-box",
  display: "flex",
  justifyContent: "start"
};

export default function FriendsPage() {
  const searchParams = typeof window !== "undefined" ? (require('next/navigation').useSearchParams ? require('next/navigation').useSearchParams() : null) : null;
  const { t, lang } = useI18n();
  const [confirmUnfriend, setConfirmUnfriend] = useState({ open: false, user: null });
  const [confirmCancelRequest, setConfirmCancelRequest] = useState({ open: false, user: null });
    // Função para cancelar amizade
  async function handleUnfriend(targetId) {
    setActionLoading(a => ({ ...a, [targetId]: true }));
    // Buscar username do outro usuário
    let otherUsername = null;
    try {
      const { data: prof } = await fetchProfilesByIds([targetId]);
      if (prof && prof[0]) otherUsername = prof[0].username;
    } catch {}
    const result = await removeFriend(userId, targetId) || {};
    const { error } = result;
    if (error) {
      console.error('Erro ao desfazer amizade:', error, result);
      alert('Erro ao desfazer amizade: ' + (error.message || JSON.stringify(error)));
      setActionError(a => ({ ...a, [targetId]: 'Erro ao desfazer amizade' }));
      setActionLoading(a => ({ ...a, [targetId]: false }));
      return;
    }
    // Buscar username do usuário que removeu (userId)
    let removerUsername = null;
    try {
      const { data: prof } = await fetchProfilesByIds([userId]);
      if (prof && prof[0]) removerUsername = prof[0].username;
    } catch {}
    // Notificação para quem removeu
    await createInboxMessage({
      user_id: userId,
      type: "friend_removed_by_self",
      content: otherUsername ? `Você removeu ${otherUsername} da sua lista de amigos.` : "Você removeu Alguém da sua lista de amigos.",
      cta: t("inbox.cta_friends"),
      cta_url: "/friends",
      lang,
      title: t("inbox.friend_removed_title_self"),
      meta: { username: otherUsername }
    });
    
    await createInboxMessage({
      user_id: targetId,
      type: "friend_removed_by_other",
      content: removerUsername ? `${removerUsername} removeu você da lista de amigos.` : "Alguém removeu você da lista de amigos.",
      cta: t("inbox.cta_friends"),
      cta_url: "/friends",
      lang,
      title: t("inbox.friend_removed_title"),
      meta: { username: removerUsername }
    });
    setActionLoading(a => ({ ...a, [targetId]: false }));
    setList(list => list.filter(row => {
      let otherId = row.from_user_id === userId ? row.to_user_id : row.from_user_id;
      return otherId !== targetId;
    }));
    setConfirmUnfriend({ open: false, user: null });
  }

  // Função para cancelar pedido enviado
  async function handleCancelRequest(requestId, targetId) {
    setActionLoading(a => ({ ...a, [requestId]: true }));
    const result = await deleteFriendRequest(requestId) || {};
    const { error, data } = result;
    if (error) {
      console.error('Erro ao cancelar pedido:', error, result);
      alert('Erro ao cancelar pedido: ' + (error.message || JSON.stringify(error)));
      setActionError(a => ({ ...a, [requestId]: 'Erro ao cancelar pedido' }));
      setActionLoading(a => ({ ...a, [requestId]: false }));
      return;
    }
    setActionLoading(a => ({ ...a, [requestId]: false }));
    setList(list => list.filter(row => row.id !== requestId));
    setConfirmCancelRequest({ open: false, user: null });
    // Após cancelar, refaz a checagem de relação para o usuário buscado
    setPendingRequests(p => {
      const copy = { ...p };
      delete copy[targetId];
      return copy;
    });
    setSearchResults(results => {
      if (!Array.isArray(results)) return results;
      return results.map(profile => {
        if (profile.id !== targetId) return profile;
        // Refaz a checagem de relação para garantir que não mostre pending/erro
        return { ...profile, _forceRefetch: Date.now() };
      });
    });
    // Refaz a checagem de relação para o usuário na busca
    try {
      const { data: rel } = await checkFriendRelationship(userId, targetId);
      setPendingRequests(p => {
        const copy = { ...p };
        if (!rel || rel.status !== "pending") delete copy[targetId];
        else copy[targetId] = true;
        return copy;
      });
      setActionError(a => {
        const copy = { ...a };
        if (!rel || rel.status !== "pending") copy[targetId] = "";
        return copy;
      });
    } catch {}
  }

  // Popup de confirmação para cancelar pedido enviado
  function renderCancelRequestPopup() {
    if (!confirmCancelRequest.open || !confirmCancelRequest.user) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ background: '#23293a', borderRadius: 14, padding: 36, minWidth: 320, boxShadow: '0 4px 32px #0008', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 18, textAlign: 'center' }}>
            Deseja cancelar o pedido de amizade para <span style={{ color: '#00E5FF' }}>{confirmCancelRequest.user.username}</span>?
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
            <button
              onClick={() => handleCancelRequest(confirmCancelRequest.user.requestId, confirmCancelRequest.user.id)}
              style={{ background: 'linear-gradient(90deg,#00E5FF,#46B3FF)', color: '#181c24', border: 'none', borderRadius: 8, padding: '8px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
            >
              SIM
            </button>
            <button
              onClick={() => setConfirmCancelRequest({ open: false, user: null })}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1.5px solid #00E5FF44', borderRadius: 8, padding: '8px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
            >
              NÃO
            </button>
          </div>
        </div>
      </div>
    );
  }
  const TABS = ["Friends","Requests","Sent"];
  // ANTES:
  // const [tab, setTab] = useState(() => {
  //   if (typeof window !== "undefined") {
  //     const params = new URLSearchParams(window.location.search);
  //     const urlTab = params.get("tab");
  //     if (urlTab && TABS.includes(urlTab)) return urlTab;
  //   }
  //   return "Friends";
  // });
  // DEPOIS:
  const [tab, setTab] = useState("Friends");

  // ANTES:
  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     const params = new URLSearchParams(window.location.search);
  //     const urlTab = params.get("tab");
  //     if (urlTab && TABS.includes(urlTab) && urlTab !== tab) {
  //       setTab(urlTab);
  //     }
  //   }
  //   // eslint-disable-next-line
  // }, [typeof window !== "undefined" ? window.location.search : null]);
  // DEPOIS:
  useEffect(() => {
    function syncTabFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      if (urlTab && TABS.includes(urlTab) && urlTab !== tab) {
        setTab(urlTab);
      }
    }
    syncTabFromUrl();
    window.addEventListener("popstate", syncTabFromUrl);
    return () => {
      window.removeEventListener("popstate", syncTabFromUrl);
    };
  }, [tab]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [userId, setUserId] = useState(null);
  const [modalUser, setModalUser] = useState(null);
  const [list, setList] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [actionError, setActionError] = useState({});
  const [pendingRequests, setPendingRequests] = useState({});
  const searchTimeout = useRef();

  // Get current user id
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setUserId(data?.user?.id || null);
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch list for current tab
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setList([]);
    setProfiles({});
    let fetcher;
    if (tab === "Friends") fetcher = fetchFriends;
    else if (tab === "Requests") fetcher = fetchIncomingRequests;
    else fetcher = fetchSentRequests;
    (async () => {
      const { data, error } = await fetcher(userId);
      if (error) {
        setList([]);
        setLoading(false);
        return;
      }
      let filteredData = data;
      // Se for aba Sent, garantir que só pedidos pendentes apareçam
      if (tab === "Sent" && Array.isArray(data)) {
        // Se não vier status, buscar manualmente
        const checkedRows = await Promise.all(data.map(async row => {
          if (row.status === "pending") return row;
          // Se não tem status, buscar
          if (!row.status) {
            try {
              const { data: rel } = await checkFriendRelationship(userId, row.to_user_id);
              if (rel && rel.status === "pending") {
                return { ...row, status: "pending" };
              }
            } catch {}
          }
          return null;
        }));
        filteredData = checkedRows.filter(Boolean);
      }
      setList(filteredData);
      // Get other user ids
      const ids = (filteredData || []).map(row =>
        row.from_user_id === userId ? row.to_user_id : row.from_user_id
      );
      const { data: profs } = await fetchProfilesByIds(ids);
      const profMap = {};
      (profs || []).forEach(p => { profMap[p.id] = p; });
      setProfiles(profMap);
      setLoading(false);
    })();
  }, [tab, userId]);

  // Search
  useEffect(() => {
    if (!userId) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!search || search.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    setSearchError("");
    searchTimeout.current = setTimeout(async () => {
      const data = await searchProfiles(search);
      setSearchResults(Array.isArray(data) ? data : []);
      // Verificar status de amizade para cada resultado
      const pendingMap = {};
      if (Array.isArray(data)) {
        await Promise.all(data.map(async (profile) => {
          if (profile.id === userId) return;
          try {
            const { data: rel } = await checkFriendRelationship(userId, profile.id);
            if (rel && rel.status === "pending") {
              pendingMap[profile.id] = true;
            }
          } catch {}
        }));
      }
      setPendingRequests(p => ({ ...p, ...pendingMap }));
      setSearchLoading(false);
    }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [search, userId]);

  // Accept/Decline actions
  async function handleAccept(id) {
    setActionLoading(a => ({ ...a, [id]: true }));
    const result = await acceptFriendRequest(id, userId) || {};
    const { error } = result;
    if (error) {
      console.error('Erro ao aceitar pedido:', error, result);
      alert('Erro ao aceitar pedido: ' + (error.message || JSON.stringify(error)));
      setActionError(a => ({ ...a, [id]: 'Erro ao aceitar pedido' }));
      setActionLoading(a => ({ ...a, [id]: false }));
      return;
    }
    // Buscar dados do pedido para saber quem é o outro usuário
    let requestRow = null;
    try {
      const { data } = await supabase
        .from("friend_requests")
        .select("from_user_id, to_user_id")
        .eq("id", id)
        .maybeSingle();
      requestRow = data;
    } catch {}
    // Buscar username do outro usuário (quem enviou o pedido)
    let otherUserId = null;
    let otherUsername = null;
    let senderUsername = null;
    if (requestRow) {
      otherUserId = requestRow.from_user_id;
      // Buscar username do outro usuário (quem enviou)
      try {
        const { data: prof } = await fetchProfilesByIds([otherUserId]);
        if (prof && prof[0]) otherUsername = prof[0].username;
      } catch {}
      // Buscar username de quem aceitou (usuário atual)
      try {
        const { data: prof } = await fetchProfilesByIds([userId]);
        if (prof && prof[0]) senderUsername = prof[0].username;
      } catch {}
    }
    // Mensagens i18n
    await createInboxMessage({
      user_id: userId,
      type: "friend_accepted_self",
      content: otherUsername ? `Agora você e ${otherUsername} são amigos.` : "Agora você e Alguém são amigos.",
      cta: t("inbox.cta_friends"),
      cta_url: "/friends",
      lang,
      meta: { username: otherUsername }
    });
    if (otherUserId && senderUsername) {
      await createInboxMessage({
        user_id: otherUserId,
        type: "friend_accepted_other",
        content: senderUsername ? `Agora você e ${senderUsername} são amigos.` : "Agora você e Alguém são amigos.",
        cta: t("inbox.cta_friends"),
        cta_url: "/friends",
        lang,
        meta: { username: senderUsername }
      });
    }
    setActionLoading(a => ({ ...a, [id]: false }));
    setList(list => list.filter(row => row.id !== id));
    setTab("Requests"); // force refetch
  }
  async function handleDecline(id) {
    setActionLoading(a => ({ ...a, [id]: true }));
    // Buscar dados do pedido para saber quem enviou
    let requestRow = null;
    try {
      const { data } = await supabase
        .from("friend_requests")
        .select("from_user_id, to_user_id")
        .eq("id", id)
        .maybeSingle();
      requestRow = data;
    } catch {}
    let senderId = null;
    let senderUsername = null;
    if (requestRow) {
      senderId = requestRow.from_user_id;
      // Buscar username de quem recusou
      try {
        const { data: prof } = await fetchProfilesByIds([userId]);
        if (prof && prof[0]) senderUsername = prof[0].username;
      } catch {}
    }
    // Deleta o pedido ao recusar
    const { error } = await deleteFriendRequest(id) || {};
    if (error) {
      console.error('Erro ao recusar pedido:', error);
      alert('Erro ao recusar pedido: ' + (error.message || JSON.stringify(error)));
      setActionError(a => ({ ...a, [id]: 'Erro ao recusar pedido' }));
      setActionLoading(a => ({ ...a, [id]: false }));
      return;
    }
    // Notificação para quem enviou o pedido
    if (senderId && senderUsername) {
      await createInboxMessage({
        user_id: senderId,
        type: "friend_request_declined",
        content: senderUsername ? `${senderUsername} recusou sua solicitação de amizade.` : "Alguém recusou sua solicitação de amizade.",
        cta: t("inbox.cta_friends"),
        cta_url: "/friends",
        lang,
        meta: { username: senderUsername }
      });
    }
    setActionLoading(a => ({ ...a, [id]: false }));
    setList(list => list.filter(row => row.id !== id));
  }
  // Add Friend from search
  async function handleAddFriend(targetId) {
    setActionLoading(a => ({ ...a, [targetId]: true }));
    // Checar relação nos dois sentidos
    let block = false;
    try {
      const { data: rel1 } = await checkFriendRelationship(userId, targetId);
      const { data: rel2 } = await checkFriendRelationship(targetId, userId);
      const rel = rel1 || rel2;
      console.log('Status da relação:', rel?.status);
      // Só bloqueia se for pending ou accepted
      if (rel && ["pending", "accepted"].includes(rel.status)) {
        block = true;
      } else {
        block = false;
      }
    } catch (e) { block = false; }
    // Limpa erro local ao tentar novamente
    setActionError(a => ({ ...a, [targetId]: "" }));
    if (block) {
      setActionError(a => ({ ...a, [targetId]: "Já existe um pedido ou amizade entre vocês." }));
      setActionLoading(a => ({ ...a, [targetId]: false }));
      setPendingRequests(p => ({ ...p, [targetId]: true }));
      setTab("Sent"); // Garante que vai para aba Sent
      // Atualiza lista de enviados imediatamente
      setTimeout(async () => {
        if (!userId) return;
        const { data, error } = await fetchSentRequests(userId);
        if (!error && Array.isArray(data)) {
          setList(data);
          const ids = data.map(row => row.to_user_id);
          const { data: profs } = await fetchProfilesByIds(ids);
          const profMap = {};
          (profs || []).forEach(p => { profMap[p.id] = p; });
          setProfiles(profMap);
        }
      }, 100);
      return;
    }
    // Buscar username do remetente
    let senderUsername = null;
    try {
      const { data: prof } = await fetchProfilesByIds([userId]);
      if (prof && prof[0]) senderUsername = prof[0].username;
    } catch {}
    const result = await sendFriendRequest(userId, targetId);
    if (result && result.error) {
      // Checa erro de duplicate key do Postgres
      if (
        result.error.message &&
        result.error.message.includes('duplicate key value violates unique constraint')
      ) {
        setActionError(a => ({ ...a, [targetId]: "Já existe um pedido de amizade entre vocês." }));
        setActionLoading(a => ({ ...a, [targetId]: false }));
        setPendingRequests(p => ({ ...p, [targetId]: true }));
        return;
      } else {
        alert('Erro ao enviar pedido: ' + (result.error.message || JSON.stringify(result.error)));
      }
    }
    // Notificação para o destinatário
    await createInboxMessage({
      user_id: targetId,
      type: "friend_request_received",
      content: senderUsername ? `${senderUsername} enviou um pedido de amizade para você.` : "Alguém enviou um pedido de amizade para você.",
      cta: t("inbox.cta_friends"),
      cta_url: "/friends?tab=Requests",
      lang,
      meta: { username: senderUsername }
    });
    setActionError(a => ({ ...a, [targetId]: "" }));
    setActionLoading(a => ({ ...a, [targetId]: false }));
    setPendingRequests({}); // Limpa o pending para forçar refetch correto
    setTab("Sent");
    setSearch("");
    // Após trocar para aba Sent, buscar imediatamente os pedidos enviados para garantir atualização
    setTimeout(async () => {
      if (!userId) return;
      const { data, error } = await fetchSentRequests(userId);
      if (!error && Array.isArray(data)) {
        setList(data);
        const ids = data.map(row => row.to_user_id);
        const { data: profs } = await fetchProfilesByIds(ids);
        const profMap = {};
        (profs || []).forEach(p => { profMap[p.id] = p; });
        setProfiles(profMap);
      }
    }, 100);
  }
  // Challenge (stub)
  function handleChallenge() {
    alert("Challenge coming soon");
  }

  // Card click opens modal
  function openModal(user) {
    setModalUser(user);
  }
  function closeModal() {
    setModalUser(null);
  }

  // Render helpers
  function renderCard(row, profile, tabType, t) {
    if (!profile) return null;
    // Only show online/offline dot for Friends tab
    let dot = null;
    if (tabType === "Friends") {
      const onlineUserIds = (typeof window !== "undefined" && window.__onlineUserIds) ? window.__onlineUserIds : [];
      const isOnline = onlineUserIds.includes(profile.id);
      const statusColor = isOnline ? "#00FF88" : "#888";
      const statusText = isOnline ? t("multiplayer.online") : t("multiplayer.offline");
      dot = (
        <div style={{ position: "relative", marginRight: 8 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: statusColor,
              display: "inline-block",
              border: "2px solid #23293a",
              boxShadow: isOnline ? "0 0 8px #00FF88" : "none"
            }}
            title={statusText}
          />
        </div>
      );
    }
    return (
      <div
        key={row.id}
        className="friend-card"
        style={{
          background: "#23293a",
          borderRadius: 12,
          padding: 18,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px #0002",
          transition: "box-shadow 0.18s",
          gap: 18,
          minHeight: 90,
          height: 100,
          width: "100%",
          boxSizing: "border-box"
        }}
        onClick={e => {
          if (e.target.tagName === "BUTTON" || e.target.classList.contains("friend-tag")) return;
          openModal({ userId: profile.id, username: profile.username, avatar: profile.avatar_preset });
        }}
      >
        {/* Online/offline dot only for Friends tab */}
        {dot}
        <img src={getAvatarSrc(profile.avatar_preset)} alt="avatar" style={{ width: 48, height: 48, borderRadius: 24, marginRight: 3 }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, fontFamily: "'Orbitron', sans-serif" }}>{profile.username}</div>
        </div>
        {tabType === "Requests" && (
          <>
            <button
              onClick={e => { e.stopPropagation(); handleAccept(row.id); }}
              disabled={actionLoading[row.id]}
              className="accept-btn"
              style={{
                background: 'linear-gradient(90deg,#00E5FF,#46B3FF)',
                border: 'none',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: actionLoading[row.id] ? 'not-allowed' : 'pointer',
                opacity: actionLoading[row.id] ? 0.7 : 1,
                boxShadow: '0 0 0 0 #00E5FF00',
                padding: 0,
                transition: 'box-shadow 0.18s, background 0.18s, border 0.18s'
              }}
              title="Aceitar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="10" fill="none" />
                <path d="M6 10.5L9 13.5L14 8.5" stroke="#181c24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDecline(row.id); }}
              disabled={actionLoading[row.id]}
              className="decline-btn"
              style={{
                background: 'rgba(255,0,0,0.10)',
                border: '1.5px solid #FF7F7F44',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: actionLoading[row.id] ? 'not-allowed' : 'pointer',
                opacity: actionLoading[row.id] ? 0.7 : 1,
                boxShadow: '0 0 0 0 #FF7F7F00',
                padding: 0,
                marginLeft: -7,
                transition: 'box-shadow 0.18s, background 0.18s, border 0.18s'
              }}
              title="Recusar"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="9" r="9" fill="none" />
                <path d="M6 6L12 12M12 6L6 12" stroke="#FF7F7F" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </>
        )}
        {tabType === "Sent" && (
          <span
            className="pending-tag"
            style={{ background: 'rgba(0,229,255,0.10)', color: '#00E5FF', border: '1px solid #00E5FF44', borderRadius: 8, padding: '6px 18px', fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 14, opacity: 0.7, cursor: 'pointer' }}
            onClick={e => {
              e.stopPropagation();
              setConfirmCancelRequest({ open: true, user: { id: row.to_user_id, username: profile.username, requestId: row.id } });
            }}
            title="Cancelar pedido de amizade"
          >
            {t("friends.pending")}
          </span>
        )}
        {tabType === "Friends" && (
          <span
            className="friend-tag"
            style={{ background: 'rgba(0,255,180,0.10)', color: '#00FFB4', border: '1px solid #00FFB444', borderRadius: 8, padding: '6px 18px', fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            onClick={e => {
              e.stopPropagation();
              setConfirmUnfriend({ open: true, user: profile });
            }}
            title="Cancelar amizade"
          >
            {t("friends.friend_tag")}
          </span>
        )}
      </div>
    );
  }
  // Popup de confirmação para desfazer amizade
  function renderUnfriendPopup() {
    if (!confirmUnfriend.open || !confirmUnfriend.user) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ background: '#23293a', borderRadius: 14, padding: 36, minWidth: 320, boxShadow: '0 4px 32px #0008', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 18, textAlign: 'center' }}>
            Deseja cancelar a amizade com <span style={{ color: '#00E5FF' }}>{confirmUnfriend.user.username}</span>?
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
            <button
              onClick={() => handleUnfriend(confirmUnfriend.user.id)}
              style={{ background: 'linear-gradient(90deg,#00E5FF,#46B3FF)', color: '#181c24', border: 'none', borderRadius: 8, padding: '8px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
            >
              SIM
            </button>
            <button
              onClick={() => setConfirmUnfriend({ open: false, user: null })}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1.5px solid #00E5FF44', borderRadius: 8, padding: '8px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
            >
              NÃO
            </button>
          </div>
        </div>
      </div>
    );
  }
// Add global style for hover effect
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    .friend-card:hover {
      box-shadow: 0 0 16px 4px #00e5ff55, 0 2px 8px #0002 !important;
    }
    .accept-btn:hover:not(:disabled) {
      box-shadow: 0 0 10px 2px #00e5ff88 !important;
    }
    .decline-btn:hover:not(:disabled) {
      box-shadow: 0 0 10px 2px #FF7F7F88 !important;
    }
  `;
  document.head.appendChild(style);
}

  function renderSearchResult(profile) {
    // Se for o próprio usuário, mostra tag "Eu" e não mostra botão
    if (profile.id === userId) {
      return (
        <div key={profile.id} style={{
          background: "#23293a",
          borderRadius: 12,
          padding: 18,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          boxShadow: "0 2px 8px #0002",
          gap: 18,
        }}>
          <img
            src={profile.avatar_preset ? `/game/images/nave_${profile.avatar_preset}.png` : "/game/images/nave_normal.png"}
            alt="avatar"
            style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, cursor: "pointer" }}
            onClick={() => openModal({ userId: profile.id, username: profile.username, avatar: profile.avatar_preset })}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{ color: "#fff", fontWeight: 700, fontSize: 17, cursor: "pointer", fontFamily: "'Orbitron', sans-serif" }}
              onClick={() => openModal({ userId: profile.id, username: profile.username, avatar: profile.avatar_preset })}
            >
              {profile.username}
            </div>
          </div>
          <span style={{ background: 'rgba(0,255,180,0.10)', color: '#00FFB4', border: '1px solid #00FFB444', borderRadius: 8, padding: '6px 18px', fontWeight: 700, fontSize: 14, opacity: 0.8 }}>Eu</span>
        </div>
      );
    }
    // Se já existe pending ou erro de pedido, mostra tag Pending
    const isPending = pendingRequests[profile.id] || (actionError[profile.id] && actionError[profile.id].includes("pedido"));
    return (
      <div key={profile.id} style={{
        background: "#23293a",
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        boxShadow: "0 2px 8px #0002",
        gap: 18,
      }}>
        <img
          src={getAvatarSrc(profile.avatar_preset)}
          alt="avatar"
          style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, cursor: "pointer" }}
          onClick={() => openModal({ userId: profile.id, username: profile.username, avatar: profile.avatar_preset })}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{ color: "#fff", fontWeight: 700, fontSize: 17, cursor: "pointer", fontFamily: "'Orbitron', sans-serif" }}
            onClick={() => openModal({ userId: profile.id, username: profile.username, avatar: profile.avatar_preset })}
          >
            {profile.username}
          </div>
        </div>
        {isPending ? (
          <span style={{ background: 'rgba(0,229,255,0.10)', color: '#00E5FF', border: '1px solid #00E5FF44', borderRadius: 8, padding: '6px 18px', fontWeight: 700, fontSize: 14, opacity: 0.7 }}>{t("friends.pending")}</span>
        ) : (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await handleAddFriend(profile.id, profile.username);
            }}
            disabled={actionLoading[profile.id]}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1.5px solid rgba(0,229,255,0.18)",
              borderRadius: "50%",
              padding: 0,
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 0 #00E5FF00",
              cursor: actionLoading[profile.id] ? "not-allowed" : "pointer",
              transition: "box-shadow 0.18s, background 0.18s, border 0.18s",
              marginRight: 8,
              opacity: actionLoading[profile.id] ? 0.7 : 1,
            }}
            title="Adicionar Amigo"
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 12px 3px #00E5FF44"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 0 0 #00E5FF00"}
          >
            <img src="/game/images/add-user.png" alt="Adicionar Amigo" style={{ width: 28, height: 28, display: 'block' }} />
          </button>
        )}
        {actionError[profile.id] && <span style={{ color: '#FF7F7F', fontSize: 13, marginLeft: 8 }}>{actionError[profile.id]}</span>}
      </div>
    );
  }

  return (
    <div style={pageContainerStyle} className="mobile-cpad">
      {galaxyBg}
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @media (max-width: 768px) {
          .friends-top-row { flex-direction: column !important; align-items: stretch !important; padding: 16px 16px 0 16px !important; gap: 8px !important; }
          .friends-flex-spacer { display: none !important; }
          .friends-search { max-width: none !important; width: 100% !important; box-sizing: border-box !important; }
          .friends-tabs-row { padding-left: 16px !important; padding-right: 16px !important; gap: 6px !important; flex-wrap: nowrap !important; }
          .friends-tab-btn { flex: 1 !important; padding: 8px 2px !important; font-size: 10px !important; text-align: center; }
          .friends-grid { grid-template-columns: 1fr !important; max-width: none !important; }
          .friends-list-wrap { padding-left: 16px !important; padding-right: 16px !important; box-sizing: border-box !important; }
        }
      `}</style>
      <div style={topRowStyle} className="friends-top-row">
        <h2 style={titleStyle}>{t("friends.title")}</h2>
        <div className="friends-flex-spacer" style={{ flex: 1 }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("friends.search_placeholder")}
          style={searchInputStyle}
          className="friends-search"
        />
      </div>
      <div style={tabsRowStyle} className="friends-tabs-row">
        {TABS.map(tabKey => {
          const selected = !search || search.length < 2 ? tab === tabKey : false;
          const TAB_LABEL = { Friends: t("friends.tab_friends"), Requests: t("friends.tab_requests"), Sent: t("friends.tab_sent") };
          return (
            <button
              key={tabKey}
              onClick={() => {
                setTab(tabKey);
                setSearch("");
              }}
              className="friends-tab-btn"
              style={{
                background: selected ? 'linear-gradient(90deg,#00E5FF,#46B3FF)' : 'rgba(0,229,255,0.10)',
                color: selected ? '#181c24' : '#00E5FF',
                border: 'none',
                borderRadius: 8,
                padding: '8px 28px',
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                opacity: selected ? 1 : 0.8,
              }}
            >
              {TAB_LABEL[tabKey]}
            </button>
          );
        })}
      </div>
      {search && search.length >= 2 && (
        <div style={{ width: "100%", maxWidth: 1100, margin: '24px 0', paddingLeft: 24, paddingRight: 24, boxSizing: 'border-box' }}>
          {searchLoading ? <div style={{ color: '#aaa' }}>{t("friends.searching")}</div> :
            (!Array.isArray(searchResults) || searchResults.length === 0)
              ? <div style={{ color: '#aaa' }}>{t("friends.no_results")}</div>
              : <div style={gridContainerStyle}><div style={gridStyle} className="friends-grid">{searchResults.map(renderSearchResult)}</div></div>}
        </div>
      )}
      {!search && (
        <div className="friends-list-wrap" style={{ width: "100%", maxWidth: 1100, minHeight: 220, marginTop: 24, boxSizing: 'border-box' }}>
          {loading ? <div style={{ color: '#aaa' }}>{t("friends.loading")}</div> :
            list.length === 0 ? (
              <div style={{ color: '#aaa', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
                {tab === "Friends" && (
                  <>
                    <div>{t("friends.empty_friends_title")}</div>
                    <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>{t("friends.empty_friends_desc")}</div>
                  </>
                )}
                {tab === "Requests" && (
                  <>
                    <div>{t("friends.empty_requests_title")}</div>
                    <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>{t("friends.empty_requests_desc")}</div>
                  </>
                )}
                {tab === "Sent" && (
                  <>
                    <div>{t("friends.empty_sent_title")}</div>
                    <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>{t("friends.empty_sent_desc")}</div>
                  </>
                )}
              </div>
            ) :
              <div style={gridContainerStyle}>
                <div style={gridStyle} className="friends-grid">
                  {list
                    .filter(row => tab !== "Sent" || row.status === "pending")
                    .map(row => {
                      let otherId;
                      if (tab === "Friends") {
                        otherId = row.from_user_id === userId ? row.to_user_id : row.from_user_id;
                      } else if (tab === "Requests") {
                        otherId = row.from_user_id;
                      } else if (tab === "Sent") {
                        otherId = row.to_user_id;
                      }
                      return renderCard(row, profiles[otherId], tab, t);
                    })}
                </div>
              </div>}
        </div>
      )}
      {modalUser && (
        <PlayerProfileModal open={!!modalUser} onClose={closeModal} player={modalUser} currentUserId={userId} hideChallengeButton />
      )}
      {renderUnfriendPopup()}
      {renderCancelRequestPopup()}
    </div>
  );
}
