import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const env = { ...process.env };
for (const f of ['frontend/.env', '.env']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
if (!existsSync('missing-photos.json')) { console.error('Missing missing-photos.json in this folder.'); process.exit(1); }

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (url, opts) => { const r = await fetch(url, opts); if (!r.ok) throw new Error(r.status + ' ' + url.slice(0, 60)); return r.json(); };

const artists = JSON.parse(readFileSync('missing-photos.json', 'utf8').replace(/^\uFEFF/, ''));
console.log(`${artists.length} artists have no photo.`);

let spotifyToken = null;
if (env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
  try {
    const t = await getJson('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET).toString('base64') },
      body: 'grant_type=client_credentials',
    });
    spotifyToken = t.access_token;
  } catch (e) { console.warn('Spotify login failed, skipping Spotify:', e.message); }
} else console.log('No Spotify keys set: skipping Spotify.');

const fromSpotify = async (name) => {
  if (!spotifyToken) return null;
  const d = await getJson('https://api.spotify.com/v1/search?type=artist&limit=10&q=' + encodeURIComponent(name), { headers: { Authorization: 'Bearer ' + spotifyToken } });
  const hit = (d.artists?.items || []).find((a) => norm(a.name) === norm(name) && a.images?.length);
  return hit ? hit.images[0].url : null;
};
const fromAudioDb = async (name) => {
  const d = await getJson('https://www.theaudiodb.com/api/v1/json/2/search.php?s=' + encodeURIComponent(name));
  const hit = (d.artists || []).find((a) => norm(a.strArtist) === norm(name) && a.strArtistThumb);
  return hit ? hit.strArtistThumb : null;
};
const fromWikipedia = async (name) => {
  const d = await getJson('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&pithumbsize=600&titles=' + encodeURIComponent(name));
  const page = Object.values(d.query?.pages || {})[0];
  return page?.thumbnail?.source || null;
};
const SOURCES = [['Spotify', fromSpotify], ['TheAudioDB', fromAudioDb], ['Wikipedia', fromWikipedia]];

const found = [], missing = [];
for (const a of artists) {
  let got = null;
  for (const [label, fn] of SOURCES) {
    try { const url = await fn(a.name); if (url) { got = { source: label, url }; break; } } catch (e) { }
    await sleep(150);
  }
  if (got) found.push({ ...a, ...got }); else missing.push(a);
  process.stdout.write(got ? '+' : '.');
}
console.log(`\nFound ${found.length}, still missing ${missing.length}.`);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = found.length
  ? `-- ${found.length} photos. Only fills artists that currently have no photo.\n` + found.map((f) => `update public.artists set photo_url = ${q(f.url)} where id = ${q(f.id)} and photo_url is null; -- ${f.name} (${f.source})`).join('\n') + '\n'
  : '-- nothing found\n';
writeFileSync('fill-photos.sql', sql);
const csv = ['name,culture,source,url', ...found.map((f) => [f.name, f.culture_id, f.source, f.url].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')), ...missing.map((m) => `"${m.name}","${m.culture_id}","NONE",""`)].join('\n');
writeFileSync('photo-review.csv', csv + '\n');
console.log('Wrote fill-photos.sql and photo-review.csv');
