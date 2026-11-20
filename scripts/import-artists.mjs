#!/usr/bin/env node
// Turns the old project's artists export into a clean SQL file for the new database.
//
//   node scripts/import-artists.mjs artists.json            (cleans, finds photos on Deezer)
//   node scripts/import-artists.mjs artists.json --no-photos (skips the photo lookup)
//
// Output: import-artists.sql (paste into Supabase > SQL Editor > Run) and import-report.txt.
// Needs Node 20+. Photo lookup needs internet access to api.deezer.com.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inputPath, ...flags] = process.argv;
if (!inputPath) { console.error('Usage: node scripts/import-artists.mjs artists.json [--no-photos]'); process.exit(1); }
const lookupPhotos = !flags.includes('--no-photos');

const CULTURES = { zulu: 'Zulu', xitsonga: 'Xitsonga', venda: 'Venda', sotho: 'Sotho', setswana: 'Setswana', ndebele: 'Ndebele', bapedi: 'Bapedi', xhosa: 'Xhosa', swati: 'Swati' };
// The old project used short codes and other spellings. Map them to the app's seven cultures.
const ALIASES = { zul: 'zulu', tso: 'xitsonga', tsonga: 'xitsonga', ven: 'venda', sot: 'sotho', sesotho: 'sotho',
  tsw: 'setswana', tswana: 'setswana', ndb: 'ndebele', ped: 'bapedi', xho: 'xhosa', isixhosa: 'xhosa', swa: 'swati', swz: 'swati', siswati: 'swati', swazi: 'swati', sepedi: 'bapedi', pedi: 'bapedi' };
const FIELDS = ['country_id', 'culture_id', 'culture_name', 'culture_symbol', 'name', 'tagline', 'genre', 'bio', 'photo_url',
  'instagram', 'spotify_url', 'youtube_url', 'has_music', 'has_vr', 'has_bioscope', 'music_route', 'vr_route', 'bioscope_route'];
const BOOLS = new Set(['has_music', 'has_vr', 'has_bioscope']);

const raw = JSON.parse(readFileSync(inputPath, 'utf8').replace(/^﻿/, ''));
const rows = Array.isArray(raw) ? raw : raw.value || [];
const report = [];
const skippedByCulture = {};

const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const isFake = (u) => !u || /placeholder\.com|example\.com/i.test(u);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const filled = (r) => FIELDS.filter((f) => r[f] !== null && r[f] !== undefined && r[f] !== '' && r[f] !== false).length;

// 1. Normalise and drop unusable rows
const usable = [];
for (const r0 of rows) {
  const r = {};
  for (const f of FIELDS) r[f] = clean(r0[f]) ?? null;
  r.bio = r.bio || clean(r0.biography) || null;
  if (isFake(r.photo_url)) r.photo_url = null;
  r.culture_id = r.culture_id ? String(r.culture_id).toLowerCase().trim() : null;
  r.culture_id = ALIASES[r.culture_id] || r.culture_id;
  if (r.culture_name && CULTURES[r.culture_id] && norm(r.culture_name) !== norm(CULTURES[r.culture_id])) r.culture_name = null;  // use the app's spelling
  r.country_id = r.country_id || 'za';
  if (!r.name) { report.push('SKIPPED (no name): ' + JSON.stringify(r0).slice(0, 80)); continue; }
  if (!CULTURES[r.culture_id]) { skippedByCulture[r.culture_id] = [...(skippedByCulture[r.culture_id] || []), r.name]; continue; }
  r.culture_name = r.culture_name || CULTURES[r.culture_id];
  r.name = r.name.replace(/\s+\(also .*\)$/i, '');   // "Makhadzi (also Venda)" -> "Makhadzi"
  for (const b of BOOLS) r[b] = !!r[b];
  usable.push(r);
}

for (const [c, names] of Object.entries(skippedByCulture)) {
  report.push(`NOT IMPORTED: culture "${c}" is not one of the app's cultures (${[...new Set(names)].length} artists): ${[...new Set(names)].join(', ')}`);
}

// 2. Merge duplicates (same name + culture): keep the fullest row, fill gaps from the others
const byKey = new Map();
for (const r of usable) {
  const k = norm(r.name) + '|' + r.culture_id;
  const cur = byKey.get(k);
  if (!cur) { byKey.set(k, r); continue; }
  const [best, other] = filled(r) > filled(cur) ? [r, cur] : [cur, r];
  for (const f of FIELDS) if ((best[f] === null || best[f] === '' || best[f] === false) && other[f]) best[f] = other[f];
  byKey.set(k, best);
}
const artists = [...byKey.values()];
report.push(`Rows in export: ${rows.length}. Usable: ${usable.length}. After merging duplicates: ${artists.length}.`);

// 3. Photos from Deezer, only on an exact name match so we never attach the wrong person
if (lookupPhotos) {
  let found = 0;
  for (const a of artists) {
    if (a.photo_url) continue;
    try {
      const res = await fetch('https://api.deezer.com/search/artist?limit=5&q=' + encodeURIComponent(a.name));
      const data = await res.json();
      const hit = (data.data || []).find((d) => norm(d.name) === norm(a.name));
      if (hit && hit.picture_big && !/\/artist\/\/|default/i.test(hit.picture_big)) { a.photo_url = hit.picture_xl || hit.picture_big; found++; }
    } catch (e) { report.push(`Photo lookup failed for ${a.name}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 120));   // stay well under Deezer's rate limit
  }
  report.push(`Photos found on Deezer: ${found}.`);
}
const noPhoto = artists.filter((a) => !a.photo_url).map((a) => a.name);
report.push(`Artists still without a photo (${noPhoto.length}): ${noPhoto.join(', ')}`);

// 4. Write SQL. Re-running is safe: rows already present (same name + culture) are skipped.
const lit = (f, v) => (v === null || v === '' ? 'null' : BOOLS.has(f) ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const values = artists.map((a) => '  (' + FIELDS.map((f) => lit(f, a[f])).join(', ') + ')').join(',\n');
const sql = `-- Generated by scripts/import-artists.mjs: ${artists.length} artists. Safe to re-run.
with v (${FIELDS.join(', ')}) as (
values
${values}
)
insert into public.artists (${FIELDS.join(', ')})
select ${FIELDS.map((f) => 'v.' + f).join(', ')}
from v
where not exists (
  select 1 from public.artists a
  where lower(a.name) = lower(v.name) and a.culture_id = v.culture_id
);
`;
writeFileSync('import-artists.sql', sql);
writeFileSync('import-report.txt', report.join('\n') + '\n');
console.log(report.join('\n'));
console.log('\nWrote import-artists.sql and import-report.txt');
