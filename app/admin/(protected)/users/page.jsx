// app/admin/(protected)/users/page.jsx
// Server component — renders user list with search/filter.
// Client interactions (search input) are handled in UsersClient.jsx.

import { getUsers } from "@/lib/admin/adminData";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }) {
  const sp = await searchParams;
  const page = Number(sp?.page) || 1;
  const search = sp?.search ?? "";
  const filter = sp?.filter ?? "all";

  const { users, total } = await getUsers({ page, limit: 30, search, filter });

  return <UsersClient users={users} total={total} page={page} search={search} filter={filter} />;
}
