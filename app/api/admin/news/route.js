// app/api/admin/news/route.js
import { NextResponse } from "next/server";
import { getAdminSession, auditLog } from "@/lib/admin/adminAuth";
import { getAdminClient } from "@/lib/admin/adminClient";

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { title, body, published, show_as_login_modal, show_in_notifications, show_in_game_updates, lang, target_user_ids, translations } = await request.json();
    if (!title || !body) return NextResponse.json({ error: "Título e conteúdo obrigatórios" }, { status: 400 });

    const db = getAdminClient();
    const newMeta = translations ? { translations } : {};

    // Direct message to specific users → record in admin_news + insert inbox rows
    if (target_user_ids?.length) {
      // Fetch recipient usernames for display in the admin list
      const { data: profiles } = await db.from("profiles").select("id, username").in("id", target_user_ids);
      const dm_usernames = (profiles || []).map(p => p.username);

      // Insert one admin_news record so admins can see, edit, delete the DM
      const { data: newsRow, error: newsErr } = await db.from("admin_news").insert({
        title, body,
        published: true,
        published_at: new Date().toISOString(),
        show_as_login_modal: !!show_as_login_modal,
        show_in_notifications: !!show_in_notifications,
        show_in_game_updates: !!show_in_game_updates,
        lang: lang ?? "all",
        created_by: session.id,
        meta: { is_dm: true, dm_user_ids: target_user_ids, dm_usernames, ...newMeta },
      }).select("id").single();
      if (newsErr) throw newsErr;

      const newsId = newsRow.id;
      const inboxMeta = {
        source_news_id: newsId,
        show_as_login_modal: !!show_as_login_modal,
        show_in_notifications: !!show_in_notifications,
        show_in_game_updates: !!show_in_game_updates,
      };

      // Insert one inbox row per recipient
      const inboxRows = target_user_ids.map(uid => ({
        user_id: uid,
        type: "admin_message",
        title,
        content: body,
        lang: lang ?? "all",
        meta: inboxMeta,
        created_at: new Date().toISOString(),
      }));
      const { error: inboxErr } = await db.from("inbox").insert(inboxRows);
      if (inboxErr) throw inboxErr;

      await auditLog({ adminUserId: session.id, action: "news.dm", targetType: "news", targetId: newsId });
      return NextResponse.json({ ok: true, dm: true, id: newsId });
    }

    const { data, error } = await db.from("admin_news").insert({
      title,
      body,
      published: !!published,
      published_at: published ? new Date().toISOString() : null,
      show_as_login_modal: !!show_as_login_modal,
      show_in_notifications: !!show_in_notifications,
      show_in_game_updates: !!show_in_game_updates,
      lang: lang ?? "all",
      created_by: session.id,
      meta: newMeta,
    }).select("id").single();

    if (error) throw error;
    await auditLog({ adminUserId: session.id, action: "news.create", targetType: "news", targetId: data.id });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id, title, body, published, show_as_login_modal, show_in_notifications, show_in_game_updates, lang, translations, clear_dm } = await request.json();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const db = getAdminClient();

    // Fetch current state to know if it was already published and if it's a DM
    const { data: current } = await db.from("admin_news").select("published, published_at, meta").eq("id", id).single();
    const wasPublished = current?.published ?? false;
    const isDm = !clear_dm && current?.meta?.is_dm === true;

    const update = { published };
    if (published && !wasPublished) {
      update.published_at = new Date().toISOString();
    } else if (!published) {
      update.published_at = null;
    }

    if (title !== undefined) update.title = title;
    if (body !== undefined) update.body = body;
    if (show_as_login_modal !== undefined) update.show_as_login_modal = !!show_as_login_modal;
    if (show_in_notifications !== undefined) update.show_in_notifications = !!show_in_notifications;
    if (show_in_game_updates !== undefined) update.show_in_game_updates = !!show_in_game_updates;
    if (lang !== undefined) update.lang = lang;

    // Handle meta update
    const existingMeta = current?.meta ?? {};
    if (clear_dm) {
      // Strip DM-specific fields, preserve everything else (translations, etc.)
      const { is_dm, dm_user_ids, dm_usernames, ...cleanMeta } = existingMeta;
      update.meta = translations !== undefined ? { ...cleanMeta, translations } : cleanMeta;
    } else if (translations !== undefined) {
      update.meta = { ...existingMeta, translations };
    }

    await db.from("admin_news").update(update).eq("id", id);

    // If this is a DM, also propagate changes to the inbox rows
    if (isDm) {
      const inboxUpdate = {};
      if (title !== undefined) inboxUpdate.title = title;
      if (body !== undefined) inboxUpdate.content = body;
      if (lang !== undefined) inboxUpdate.lang = lang;
      // Update meta flags while preserving source_news_id
      inboxUpdate.meta = {
        source_news_id: id,
        show_as_login_modal: show_as_login_modal !== undefined ? !!show_as_login_modal : undefined,
        show_in_notifications: show_in_notifications !== undefined ? !!show_in_notifications : undefined,
        show_in_game_updates: show_in_game_updates !== undefined ? !!show_in_game_updates : undefined,
      };
      await db.from("inbox").update(inboxUpdate).contains("meta", { source_news_id: id });
    }

    await auditLog({ adminUserId: session.id, action: published ? "news.publish" : "news.unpublish", targetType: "news", targetId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id } = await request.json();
    const db = getAdminClient();
    // If this is a DM, delete the associated inbox rows first
    const { data: record } = await db.from("admin_news").select("meta").eq("id", id).single();
    if (record?.meta?.is_dm) {
      await db.from("inbox").delete().contains("meta", { source_news_id: id });
    }
    await db.from("admin_news").delete().eq("id", id);
    await auditLog({ adminUserId: session.id, action: "news.delete", targetType: "news", targetId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
