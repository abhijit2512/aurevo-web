// server.js (ESM)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';
import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

// ===== Config =====
const CLIENT_ID = process.env.CLIENT_ID || ''; // Azure App registration (application) ID
const TENANT_ID = process.env.TENANT_ID || ''; // Directory (tenant) ID
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Basic guard
if (!CLIENT_ID || !TENANT_ID) {
  console.warn('⚠️  Set CLIENT_ID and TENANT_ID env vars for token validation.');
}

// ===== Middleware =====
app.use(morgan('tiny'));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed'), false);
  }
}));
app.use(express.json());

// ===== Auth (verify MSAL ID token) =====
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;
const jwtCheck = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
  }),
  audience: CLIENT_ID,
  issuer: ISSUER,
  algorithms: ['RS256'],
  requestProperty: 'auth' // decoded token at req.auth
});

// tiny in-memory role store: sub -> { name, email, role }
const users = new Map();

// helper: ensure user exists with default role Consumer
function ensureUser(auth) {
  const sub = auth?.sub;
  if (!sub) return null;
  if (!users.has(sub)) {
    users.set(sub, {
      name: auth.name || 'User',
      email: auth.preferred_username || auth.email || '',
      role: 'Consumer'
    });
  }
  return { sub, ...users.get(sub) };
}

// ===== Demo video data (in-memory) =====
let videos = [
  {
    id: '1',
    title: 'Welcome to aurevo',
    publisher: 'aurevo',
    playbackUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date().toISOString()
  }
];

// ===== API =====

// Public: list videos
app.get('/videos', (req, res) => {
  res.json(videos);
});

// Authenticated: who am I?
app.get('/me', jwtCheck, (req, res) => {
  const u = ensureUser(req.auth);
  if (!u) return res.status(401).send('unauthorized');
  res.json({ user: { name: u.name, email: u.email, role: u.role } });
});

// Authenticated: switch role
app.post('/me/role', jwtCheck, (req, res) => {
  const u = ensureUser(req.auth);
  if (!u) return res.status(401).send('unauthorized');
  const next = (req.body?.role || '').trim();
  if (!['Creator', 'Consumer'].includes(next)) return res.status(400).send('invalid role');
  users.set(u.sub, { name: u.name, email: u.email, role: next });
  res.json({ ok: true, role: next });
});

// Authenticated + Creator: create video
app.post('/videos', jwtCheck, (req, res) => {
  const u = ensureUser(req.auth);
  if (!u) return res.status(401).send('unauthorized');
  if (users.get(u.sub).role !== 'Creator') return res.status(403).send('Creators only');

  const { title, publisher, producer, genre, age, playbackUrl, external } = req.body || {};
  if (!title || !playbackUrl) return res.status(400).send('Title and playbackUrl required');
  const id = Date.now().toString();
  const v = {
    id,
    title,
    publisher: publisher || '',
    producer: producer || '',
    genre: genre || '',
    age: age || '',
    playbackUrl,
    external: !!external,
    createdAt: new Date().toISOString()
  };
  videos.unshift(v);
  res.json({ ok: true, id });
});

// Health
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ===== Static front-end =====
app.use(express.static(PUBLIC, { extensions: ['html'] }));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

app.listen(PORT, () => console.log(`aurevo listening on ${PORT}`));

