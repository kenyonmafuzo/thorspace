// app/admin/(protected)/users/[id]/page.jsx
import { getUserById } from "@/lib/admin/adminData";
import { notFound } from "next/navigation";
import UserDetailClient from "./UserDetailClient";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }) {
  const { id } = await params;
  let user;
  try {
    user = await getUserById(id);
  } catch (err) {
    return (
      <div style={{ padding: "2rem", color: "#f87171" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Erro ao carregar usuário</h2>
        <pre style={{ fontSize: "0.8rem", opacity: 0.7 }}>{err?.message ?? String(err)}</pre>
      </div>
    );
  }
  if (!user) notFound();
  return <UserDetailClient user={user} />;
}
