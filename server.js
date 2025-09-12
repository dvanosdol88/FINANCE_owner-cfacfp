// server.js
import express from "express";
import path from "path";
import pg from "pg";
import fetch from "node-fetch";
import fs from "fs";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  PORT = 10000,
  NODE_ENV = "development",
  DATABASE_URL,
  // Admin protection for refresh route
  ADMIN_REFRESH_SECRET,
  // Teller auth. Prefer ACCESS_TOKEN; fall back to basic with APP_ID:APP_SECRET if needed.
  TELLER_ACCESS_TOKEN,
  TELLER_APPLICATION_ID,
  TELLER_APPLICATION_SECRET,
  // Optional mTLS for production (client cert + key paths mounted via Render Secret Files)
  TELLER_CLIENT_CERT_PATH,
  TELLER_CLIENT_KEY_PATH,
} = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl:
    NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// --- bootstrap schema ---
async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      create table if not exists institutions(
        id text primary key,
        name text
      );
    `);
    await client.query(`
      create table if not exists accounts(
        id text primary key,
        institution_id text references institutions(id) on delete cascade,
        name text,
        type text,
        subtype text
      );
    `);
    await client.query(`
      create table if not exists balances(
        id bigserial primary key,
        account_id text references accounts(id) on delete cascade,
        available numeric,
        ledger numeric,
        as_of timestamptz default now()
      );
    `);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
await ensureSchema();

// --- health ---
app.get("/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.type("text/plain").send("ok");
  } catch {
    res.status(500).type("text/plain").send("db_error");
  }
});

// --- api: latest balances per account ---
app.get("/api/balances", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `
      with latest as (
        select b.*, row_number() over (partition by b.account_id order by b.as_of desc) rn
        from balances b
      )
      select a.id as account_id, a.name, a.type, a.subtype,
             l.available, l.ledger, l.as_of
      from accounts a
      left join latest l on l.account_id = a.id and l.rn = 1
      order by a.name
      `
    );
    if (!rows.length) return res.sendStatus(204);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "query_failed" });
  }
});

// ---------- ADMIN REFRESH ----------
// Calls Teller, upserts institutions/accounts, inserts current balances.
app.post("/admin/refresh", async (req, res) => {
  // Simple shared-secret protection
  const secret = req.header("X-Admin-Secret");
  if (!ADMIN_REFRESH_SECRET || secret !== ADMIN_REFRESH_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // Prepare HTTPS agent with optional mTLS
  let httpsAgent;
  try {
    if (TELLER_CLIENT_CERT_PATH && TELLER_CLIENT_KEY_PATH) {
      httpsAgent = new https.Agent({
        cert: fs.readFileSync(TELLER_CLIENT_CERT_PATH),
        key: fs.readFileSync(TELLER_CLIENT_KEY_PATH),
      });
    }
  } catch (e) {
    console.error("mTLS read error", e);
    return res.status(500).json({ error: "mtls_read_failed" });
  }

  // Build Basic auth for Teller
  // Preferred in practice: ACCESS_TOKEN with empty password.
  // Fallback: APP_ID:APP_SECRET for endpoints that allow it.
  let basicAuth;
  if (TELLER_ACCESS_TOKEN) basicAuth = Buffer.from(`${TELLER_ACCESS_TOKEN}:`).toString("base64");
  else if (TELLER_APPLICATION_ID && TELLER_APPLICATION_SECRET)
    basicAuth = Buffer.from(`${TELLER_APPLICATION_ID}:${TELLER_APPLICATION_SECRET}`).toString("base64");
  else
    return res.status(500).json({ error: "teller_auth_not_configured" });

  const tell = async (url) => {
    const r = await fetch(url, {
      agent: httpsAgent,
      headers: { Authorization: `Basic ${basicAuth}` },
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`teller_http_${r.status}: ${t}`);
    }
    return r.json();
  };

  // Teller endpoints
  const base = "https://api.teller.io";
  const listAccountsUrl = `${base}/accounts`;

  const client = await pool.connect();
  try {
    const accounts = await tell(listAccountsUrl);

    // Upsert institutions and accounts
    await client.query("BEGIN");

    for (const acc of accounts) {
      // acc structure per docs includes institution details and id
      // Fetch balances for this account
      const bal = await tell(`${base}/accounts/${encodeURIComponent(acc.id)}/balances`);

      // Upsert institution
      if (acc.institution && acc.institution.id) {
        await client.query(
          `insert into institutions(id, name)
           values($1, $2)
           on conflict (id) do update set name = excluded.name`,
          [acc.institution.id, acc.institution.name || null]
        );
      }

      // Upsert account
      await client.query(
        `insert into accounts(id, institution_id, name, type, subtype)
         values($1, $2, $3, $4, $5)
         on conflict (id) do update
           set institution_id = excluded.institution_id,
               name = excluded.name,
               type = excluded.type,
               subtype = excluded.subtype`,
        [
          acc.id,
          acc.institution ? acc.institution.id : null,
          acc.name || acc.mask || acc.id,
          acc.type || null,
          acc.subtype || null,
        ]
      );

      // Insert current balance snapshot
      await client.query(
        `insert into balances(account_id, available, ledger, as_of)
         values($1, $2, $3, now())`,
        [
          acc.id,
          bal.available != null ? bal.available : null,
          bal.ledger != null ? bal.ledger : null,
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ accounts: accounts.length, status: "ok" });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(502).json({ error: "refresh_failed", detail: String(e.message || e) });
  } finally {
    client.release();
  }
});

// --- static index ---
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
