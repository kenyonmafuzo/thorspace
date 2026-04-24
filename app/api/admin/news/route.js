// app/api/admin/news/route.js
import { NextResponse } from "next/server";
import { getAdminSession, auditLog } from "@/lib/admin/adminAuth";
import { getAdminClient } from "@/lib/admin/adminClient";

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { title, body, published, show_as_login_modal, show_in_notifications, show_in_game_updates, lang, target_user_id } = await request.json();
    if (!title || !body) return NextResponse.json({ error: "Título e conteúdo obrigatórios" }, { status: 400 });

    const db = getAdminClient();

    // Direct message to a specific user → insert into inbox
    if (target_user_id) {
      const { error } = await db.from("inbox").insert({
        user_id: target_user_id,
        type: "admin_message",
        title,
        content: body,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      await auditLog({ adminUserId: session.id, action: "news.dm", targetType: "user", targetId: target_user_id });
      return NextResponse.json({ ok: true, dm: true });
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
    const { id, title, body, published, show_as_login_modal, show_in_notifications, show_in_game_updates, lang } = await request.json();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const db = getAdminClient();

    // Only update published_at when transitioning from unpublished → published
    // (fetch current state to know if it was already published)
    const { data: current } = await db.from("admin_news").select("published, published_at").eq("id", id).single();
    const wasPublished = current?.published ?? false;

    const update = { published };
    if (published && !wasPublished) {
      // Newly published — set published_at now
      update.published_at = new Date().toISOString();
    } else if (!published) {
      // Unpublishing — clear published_at
      update.published_at = null;
    }
    // If already published and staying published — keep original published_at untouched

    if (title !== undefined) update.title = title;
    if (body !== undefined) update.body = body;
    if (show_as_login_modal !== undefined) update.show_as_login_modal = !!show_as_login_modal;
    if (show_in_notifications !== undefined) update.show_in_notifications = !!show_in_notifications;
    if (show_in_game_updates !== undefined) update.show_in_game_updates = !!show_in_game_updates;
    if (lang !== undefined) update.lang = lang;
    await db.from("admin_news").update(update).eq("id", id);
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
    await db.from("admin_news").delete().eq("id", id);
    await auditLog({ adminUserId: session.id, action: "news.delete", targetType: "news", targetId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
