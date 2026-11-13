# Kraal Culture (Kwa Khanye)

A web app for exploring African cultures through music, art and stories. Pick a country, a culture and an artist, then enter that artist's world: music, a Home VR room (NFT gallery and online store) and a Bioscope.

## Stack

- **Frontend:** React 19, Vite, React Router, Supabase JS
- **Backend:** Node and Express, a small proxy for the Deezer search API (Deezer blocks direct browser calls)
- **Database and auth:** Supabase (Postgres, Auth, Storage)

## Features added in this version

- **Theme toggle:** dark (default) or light, from the sun/moon button in the header (floating on the sign-in pages). The choice is saved in the browser. Colours are tokens in `frontend/src/styles/theme.css`; add new colours as `rgb(var(--text-rgb))` style tokens, not hex values.
- **Music uploads:** signed-in users can upload MP3/M4A/AAC/WAV/OGG/WEBM/FLAC (max 20 MB) on the Music page under **My Uploads**. Files are private to the uploader (private `user-music` bucket, row level security on `user_tracks`) and play through one-hour signed URLs.
- **Mobile layout:** Music, Now Playing and HomeVR were reworked for phones; the HomeVR hotspots now stay aligned with the artwork at any screen size.

## Project structure

```
frontend/   React app
backend/    Express proxy (Deezer search)
supabase/   schema.sql (tables, security rules, storage) and seed.sql
```

## Setup

You need Node 20 or newer and a free [Supabase](https://supabase.com) project.

### 1. Database

1. Create a new Supabase project.
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql` and run it. It creates `profiles`, `artists`, `user_tracks`, the `avatars` and private `user-music` storage buckets, row level security policies, the signup trigger and the `username_available` function.
3. Add artists with the Table Editor or `supabase/seed.sql`.
4. Under **Authentication > URL Configuration** set the Site URL and add these redirect URLs: `http://localhost:5173`, `http://localhost:5173/reset-password` and the same two for your production domain.
5. Optional: enable the Google provider under **Authentication > Providers**.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env     # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev              # http://localhost:5173
```

In development Vite forwards `/api/*` to the backend on port 5000. In production set `VITE_API_URL` to the deployed backend URL and add the frontend origin to `CORS_ORIGINS` on the backend.

## Scripts

| Where | Command | What it does |
| --- | --- | --- |
| frontend | `npm run dev` | Dev server |
| frontend | `npm run build` | Production build |
| frontend | `npm run lint` | ESLint |
| backend | `npm run dev` | Server with auto-reload |
| backend | `npm start` | Server |

## Security notes

- Never commit `.env` files. Only `.env.example` is tracked.
- The Supabase anon key is public by design. Your data is protected by the row level security policies in `schema.sql`, so keep RLS enabled on every table.
- Never put the Supabase service role key in the frontend.

## Status and known limitations

Working: sign up, sign in, Google sign in (once enabled), password reset, avatar upload, country, culture and artist browsing, artist profiles, music search and 30 second previews.

Prototype only (uses hardcoded data, no real backend yet):

- **NFT gallery** and **online store**: no wallet, minting, cart or checkout.
- **Bioscope**: a background image with two click zones, no film content.
- **Now Playing:** the "Add", "Remove" and heart buttons do nothing, and the playlist is lost on page refresh.
- `Music.jsx` still contains an unused mini player that can be removed.

## Before launch

- [ ] Connect a custom domain
- [ ] Privacy policy and terms and conditions pages
- [ ] Decide what to do with the prototype pages above (finish or remove)
- [ ] Compress the large PNGs in `frontend/src/assets/images` (convert to WebP)
- [ ] Consolidate fonts (several families are currently loaded through separate CSS imports)
- [ ] Add tests and CI (install, lint, build)
