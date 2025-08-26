import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

app.use(morgan('tiny'));
app.use(cors());
app.use(express.json());

// ---- API ----

// temporary in-memory videos
let videos = [
  {
    id: '1',
    title: 'Welcome to aurevo',
    publisher: 'aurevo',
    playbackUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: new Date().toISOString()
  }
];

// GET /videos
app.get('/videos', (req, res) => {
  res.json(videos);
});

// GET /me  (very simple demo; your real code should validate the MSAL id token)
app.get('/me', (req, res) => {
  // default to Guest/Consumer
  const user = { name: 'Guest', role: 'Consumer' };
  res.json({ user });
});

// POST /me/role  (demo only)
app.post('/me/role', (req, res) => {
  // persist to DB in a real app
  res.json({ ok: true });
});

// ---- Static front-end ----
app.use(express.static(PUBLIC, { extensions: ['html'] }));

// Single Page App fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

app.listen(PORT, () => console.log(`aurevo listening on ${PORT}`));
