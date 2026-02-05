"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UsernamePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // mantém o mesmo id do seu HTML
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      setError("");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(sessionError);
        setError("Erro ao verificar sessão. Recarregue a página.");
        setLoading(false);
        return;
      }

      const session = sessionData?.session;
      if (!session) {
        router.replace("/login");
        return;
      }

      // se já tem username no Supabase, pula e vai pro jogo
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
        setError("Erro ao carregar perfil. Verifique tabela/policies no Supabase.");
        setLoading(false);
        return;
      }

      if (profile?.username) {
        localStorage.setItem("thor_username", profile.username);
        localStorage.setItem("thor_userid", session.user.id);
        router.replace("/mode");
        return;
      }

      setLoading(false);
    })();
  }, [router]);

  async function handleLoginClick() {
    setError("");

    const clean = name.trim();
    if (clean.length < 3) {
      setError("Escolha um nome com pelo menos 3 caracteres.");
      return;
    }

    setSaving(true);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error(sessionError);
      setError("Erro ao verificar sessão. Tente novamente.");
      setSaving(false);
      return;
    }

    const session = sessionData?.session;
    if (!session) {
      router.replace("/login");
      return;
    }

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, username: clean }, { onConflict: "id" });

    if (upsertError) {
      console.error(upsertError);
      const isUniqueViolation =
        upsertError.code === "23505" ||
        (upsertError.message || "").toLowerCase().includes("duplicate");

      setError(
        isUniqueViolation
          ? "Esse nome já está em uso. Tente outro."
          : "Não consegui salvar seu nome. Verifique as policies (RLS) no Supabase."
      );

      setSaving(false);
      return;
    }

    localStorage.setItem("thor_username", clean);
    localStorage.setItem("thor_userid", session.user.id);

    router.replace("/mode");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#05070c", color: "#fff", padding: 24 }}>
        Carregando...
      </div>
    );
  }

  return (
    <>
      {/* ✅ Mesmo container e ids do seu HTML */}
      <div id="startContainer" style={{ display: "flex" }}>
        <img
          id="thorspace-logo"
          src="/game/images/thorspace.png"
          alt="ThorSpace Logo"
        />

        <div id="startModal">
          <div className="modal-content">
            <label htmlFor="playerNameInput">Enter your name:</label>
            <input
              type="text"
              id="playerNameInput"
              maxLength={16}
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            {error ? <div className="errorText">{error}</div> : null}

            <button id="startBtn" onClick={handleLoginClick} disabled={saving}>
              {saving ? "SAVING..." : "Login"}
            </button>
          </div>
        </div>
      </div>

      {/* ✅ CSS "colado" aqui pra ficar igualzinho (você pode substituir pelos seus estilos exatos depois) */}
      <style jsx>{`
        #startContainer {
          min-height: 100dvh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #05070c;
          position: relative;
          overflow: hidden;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
        }

        #thorspace-logo {
          position: absolute;
          top: 40px;
          width: 420px;
          max-width: 85vw;
          filter: drop-shadow(0 0 18px rgba(57, 200, 255, 0.45));
          user-select: none;
          pointer-events: none;
        }

        #startModal {
          width: min(680px, 92vw);
          border-radius: 18px;
          border: 2px solid rgba(57, 200, 255, 0.55);
          box-shadow: 0 0 28px rgba(57, 200, 255, 0.25);
          background: rgba(10, 12, 18, 0.55);
          backdrop-filter: blur(6px);
          padding: 0;
        }

        .modal-content {
          padding: 28px;
          display: grid;
          gap: 16px;
          justify-items: center;
        }

        label {
          font-size: 28px;
          opacity: 0.95;
          color: #fff;
        }

        #playerNameInput {
          width: min(520px, 90%);
          height: 54px;
          border-radius: 10px;
          border: 2px solid rgba(57, 200, 255, 0.55);
          background: rgba(0, 0, 0, 0.35);
          color: #fff;
          font-size: 20px;
          padding: 0 14px;
          outline: none;
          box-shadow: inset 0 0 16px rgba(57, 200, 255, 0.25);
        }

        #startBtn {
          margin-top: 10px;
          width: 220px;
          height: 56px;
          border-radius: 12px;
          border: 1px solid rgba(57, 200, 255, 0.65);
          background: rgba(57, 200, 255, 0.25);
          color: #bff0ff;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          box-shadow: 0 0 22px rgba(57, 200, 255, 0.25);
        }

        #startBtn:disabled {
          opacity: 0.65;
          cursor: default;
        }

        .errorText {
          margin-top: -6px;
          color: #ff8a8a;
          font-size: 14px;
          text-align: center;
          max-width: 520px;
        }
      `}</style>
    </>
  );
}
