// Supabase Management API üzerinden SQL çalıştırır.
// Kullanım:
//   node scripts/db-query.mjs --file supabase/migrations/0001_init.sql
//   node scripts/db-query.mjs --sql "select count(*) from public.tenants"
// Token: SUPABASE_ACCESS_TOKEN env değişkeni (PAT, sbp_...)

import { readFileSync } from "node:fs";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token || !PROJECT_REF) {
  console.error("SUPABASE_ACCESS_TOKEN ve SUPABASE_PROJECT_REF env değişkenleri gerekli");
  process.exit(1);
}

const args = process.argv.slice(2);
let query;
const fileIdx = args.indexOf("--file");
const sqlIdx = args.indexOf("--sql");
if (fileIdx !== -1) query = readFileSync(args[fileIdx + 1], "utf8");
else if (sqlIdx !== -1) query = args[sqlIdx + 1];
else {
  console.error("--file <path> veya --sql <query> verin");
  process.exit(1);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  }
);

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}
console.log(text || "(boş sonuç)");
