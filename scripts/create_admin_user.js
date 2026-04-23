#!/usr/bin/env node
// scripts/create_admin_user.js
// Run once to create the first admin user.
// Usage: node scripts/create_admin_user.js <email> <password> <displayName> [role]
//
// Example:
//   node scripts/create_admin_user.js admin@thorspace.com.br Senha123! "Admin" super_admin

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const [,, email, password, displayName, role = "super_admin"] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/create_admin_user.js <email> <password> <displayName> [role]");
  process.exit(1);
}

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const { data, error } = await db
    .from("admin_users")
    .insert({ email: email.toLowerCase(), password_hash: passwordHash, role, display_name: displayName ?? email })
    .select("id, email, role")
    .single();

  if (error) {
    console.error("Error creating admin user:", error.message);
    process.exit(1);
  }

  console.log("Admin user created:");
  console.log("  ID:    ", data.id);
  console.log("  Email: ", data.email);
  console.log("  Role:  ", data.role);
}

main();
