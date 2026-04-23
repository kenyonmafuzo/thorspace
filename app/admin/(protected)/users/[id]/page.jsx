// app/admin/(protected)/users/[id]/page.jsx
import { getUserById } from "@/lib/admin/adminData";
import { notFound } from "next/navigation";
import UserDetailClient from "./UserDetailClient";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();
  return <UserDetailClient user={user} />;
}
