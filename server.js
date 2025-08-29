// server.js (ESM) — PUBLIC BY DEFAULT, AUTH OPTIONAL
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import morgan from "morgan";
import { expressjwt as jwt } from "express-jwt";
import jwksRsa from "jwks-rsa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

// ===== Env & Config =====
const CLIENT_ID = process.env.CLIENT_ID || "";   // Azure App registration (application) ID
const TENANT_ID = process.env.TENANT_ID || "";   // Directory (tenant) ID

// If ALLOWED_ORIGINS is empty → allow all (useful for public site)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Whether auth is enabled
const hasAuth = Boolean(CLIENT_ID && TENANT_ID);
if (!hasAuth) {
  console.warn("⚠️  Running with AUTH DISABLED (public site). Set CLIENT_ID & TENANT_ID to enable auth.");
}

// ===== Middleware =====
app.use(morgan("tiny"));
app.use(express.json());

// CORS: allow all when no list provided (public), otherwise restrict
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin or curl
      if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("CORS not allowed"), false);
    },
    credentials: true
  })
);

// ===== Optional Auth (only active when hasAuth = true) =====
let requireAuth = (_req, _res, next) => next(); // no-op if auth is off

// tiny in-memory role store: sub -> { name, email, role }
const users = new Map();

function ensureUser(auth) {
  const sub = auth?.sub;
  if (!sub) return null;
  if (!users.has(sub)) {
    users.set(sub, {
      name: auth.name || "User",
      email: auth.preferred_username || auth.email || "",
      role: "Consumer"
    });
  }
  return { sub, ...users.get(sub) };
}

if (hasAuth) {
  const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;
  requireAuth = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
    }),
    audience: CLIENT_ID,
    issuer: ISSUER,
    algorithms: ["RS256"],
    requestProperty: "auth"
  });
}

// ===== Demo data =====
let videos = [
  {
    id: "1",
    title: "Welcome to aurevo",
    publisher: "aurevo",
    playbackUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    createdAt: new Date().toISOString()
  }
];

// ===== API =====

// Simple health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Expose auth status for front-ends to adjust UI
app.get("/auth/status", (_req, res) => res.json({ hasAuth }));

// PUBLIC: list videos
app.get("/videos", (_req, res) => res.json(videos));

// Identity endpoint
// - When auth OFF: return Guest (no login flow)
// - When auth ON: protected by requireAuth
app.get("/me", hasAuth ? requireAuth : (_req, res, next) => next(), (req, res) => {
  if (!hasAuth) return res.json({ user: { name: "Guest", email: "", role: "Consumer" } });
  const u = ensureUser(req.auth);
  if (!u) return res.status(401).send("unauthorized");
  res.json({ user: { name: u.name, email: u.email, role: u.role } });
});

// Switch role — only when auth is enabled
app.post("/me/role", hasAuth ? requireAuth : (_req, res) => res.status(403).send("roles require login"), (req, res) => {
  const u = ensureUser(req.auth);
  if (!u) return res.status(401).send("unauthorized");
  const nextRole = (req.body?.role || "").trim();
  if (!["Creator", "Consumer"].includes(nextRole)) return res.status(400).send("invalid role");
  users.set(u.sub, { name: u.name, email: u.email, role: nextRole });
  res.json({ ok: true, role: nextRole });
});

// Create video — protected when auth ON; disabled when auth OFF
app.post("/videos", hasAuth ? requireAuth : (_req, res) => res.status(403).send("upload disabled"), (req, res) => {
  const u = ensureUser(req.auth);
  if (!u) return res.status(401).send("unauthorized");
  if (users.get(u.sub).role !== "Creator") return res.status(403).send("Creators only");

  const { title, publisher, producer, genre, age, playbackUrl, external } = req.body || {};
  if (!title || !playbackUrl) return res.status(400).send("Title and playbackUrl required");
  const id = Date.now().toString();
  const v = {
    id,
    title,
    publisher: publisher || "",
    producer: producer || "",
    genre: genre || "",
    age: age || "",
    playbackUrl,
    external: !!external,
    createdAt: new Date().toISOString()
  };
  videos.unshift(v);
  res.json({ ok: true, id });
});

// ===== Static front-end =====
app.use(express.static(PUBLIC, { extensions: ["html"] }));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC, "index.html"));
});

// ===== Start =====
app.listen(PORT, () => console.log(`aurevo listening on ${PORT} — auth ${hasAuth ? "ENABLED" : "DISABLED"}`));
