require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Comma-separated list of allowed frontend origins, e.g.
// CORS_ORIGINS=http://localhost:5173,https://your-domain.com
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / tools without an Origin header (curl, health checks)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);
app.use(express.json());

const DEEZER_BASE = 'https://api.deezer.com';
const MAX_LIMIT = 50;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Deezer does not send CORS headers, so the browser cannot call it directly.
// The frontend calls this route instead.
app.get('/api/deezer/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Missing "q" query parameter' });
  }
  if (query.length > 200) {
    return res.status(400).json({ error: '"q" is too long' });
  }

  const requested = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), MAX_LIMIT) : 30;

  try {
    const response = await fetch(
      `${DEEZER_BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) {
      return res.status(502).json({ error: `Deezer responded with ${response.status}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Deezer proxy error:', err.message);
    res.status(502).json({ error: 'Could not reach Deezer. Please try again.' });
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  res.status(err.message?.includes('CORS') ? 403 : 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
