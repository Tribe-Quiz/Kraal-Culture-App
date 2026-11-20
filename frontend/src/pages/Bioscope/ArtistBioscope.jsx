// ArtistBioscope.jsx: one artist's Bioscope room.
// Three screens: Story (left), Biography (middle), Music Videos (right). Videos come from
// public.artist_videos (YouTube links) and are sorted into screens by their "kind".
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import roomImage from '../../assets/images/Bioscope Kraal.png';

const SECTIONS = [
  { key: 'story',     label: 'Story',        kind: 'story',       box: { left: '16.5%', top: '16.5%', width: '17.8%', height: '25%' } },
  { key: 'biography', label: 'Biography',    kind: 'biography',   box: { left: '42.4%', top: '18.9%', width: '16.8%', height: '23%' } },
  { key: 'music',     label: 'Music Videos', kind: 'music video', box: { left: '67.3%', top: '18%',   width: '18%',   height: '23.7%' } },
];

function youtubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    if (u.pathname.startsWith('/embed/') || u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
    return u.searchParams.get('v');
  } catch {
    return null;
  }
}

const css = `
.abio-stage { position: relative; aspect-ratio: 1368 / 768; width: min(100vw, calc(100vh * 1368 / 768)); background-size: 100% 100%; background-repeat: no-repeat; }
.abio-hot { position: absolute; z-index: 20; cursor: pointer; appearance: none; border: 0; padding: 0; background: transparent; border-radius: 2px; transition: background 0.3s, box-shadow 0.3s; }
.abio-hot:hover, .abio-hot:focus-visible { background: radial-gradient(ellipse at center, rgba(232,168,76,0.18), transparent 80%); box-shadow: inset 0 0 30px rgba(232,168,76,0.3), 0 0 40px rgba(198,122,52,0.25); outline: none; }
.abio-tag { position: absolute; left: 50%; top: calc(100% + 0.4vw); transform: translateX(-50%); white-space: nowrap; padding: 0.2rem 0.8rem; border-radius: 50px; background: rgba(0,0,0,0.6); color: #f3dcae; border: 1px solid rgba(232,168,76,0.45); font-family: var(--font-body); font-size: clamp(0.6rem, 1.5vw, 0.95rem); letter-spacing: 0.05em; pointer-events: none; }
.abio-name { position: absolute; z-index: 20; left: 50%; bottom: 1.2%; transform: translateX(-50%); white-space: nowrap; padding: 0.3rem 1.1rem; border-radius: 50px; background: rgba(0,0,0,0.55); color: #f3dcae; border: 1px solid rgba(232,168,76,0.45); font-family: var(--font-display); font-size: clamp(0.8rem, 1.9vw, 1.1rem); letter-spacing: 0.06em; display: none; }
.abio-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.78); overflow-y: auto; padding: 5.5rem 1rem 3rem; box-sizing: border-box; }
.abio-panel { position: relative; max-width: 1000px; margin: 0 auto; background: rgb(var(--shade-rgb)); color: rgb(var(--gold-rgb)); border: 1px solid rgba(var(--hi-rgb), 0.4); border-radius: 14px; padding: 1.5rem 1.25rem 2rem; font-family: var(--font-body); box-sizing: border-box; }
.abio-close { position: absolute; top: 0.75rem; right: 0.75rem; width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(var(--hi-rgb), 0.5); background: transparent; color: inherit; cursor: pointer; font-size: 1rem; }
.abio-eyebrow { font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgb(var(--accent-text-rgb)); }
.abio-panel h2 { font-family: var(--font-display); font-size: clamp(1.6rem, 4vw, 2.4rem); margin: 0.3rem 2.5rem 1rem 0; }
.abio-screen { position: relative; aspect-ratio: 16 / 9; width: 100%; background: #000; border: 1px solid rgba(var(--hi-rgb), 0.4); border-radius: 10px; overflow: hidden; }
.abio-screen iframe, .abio-fallback { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.abio-fallback { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; color: #f3dcae; text-align: center; padding: 1rem; }
.abio-fallback a { color: #e8a84c; }
.abio-now { margin: 1rem 0 0.25rem; font-family: var(--font-display); font-size: 1.35rem; }
.abio-desc { margin: 0 0 1.5rem; color: rgba(var(--gold-rgb), 0.75); line-height: 1.6; max-width: 70ch; }
.abio-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
.abio-card { appearance: none; text-align: left; font: inherit; color: inherit; cursor: pointer; padding: 0; background: rgba(var(--shade-rgb), 0.9); border: 1px solid rgba(var(--hi-rgb), 0.3); border-radius: 12px; overflow: hidden; min-width: 0; }
.abio-card[aria-current="true"] { border-color: rgb(var(--accent-text-rgb)); box-shadow: 0 0 0 2px rgba(var(--accent-text-rgb), 0.35); }
.abio-thumb { aspect-ratio: 16 / 9; background: #1a0d06 center / cover no-repeat; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #f3dcae; }
.abio-card-title { margin: 0; padding: 0.65rem 0.85rem 0.8rem; font-size: 0.92rem; font-weight: 600; overflow-wrap: anywhere; }
.abio-bio { display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: flex-start; }
.abio-bio img { width: 160px; max-width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; border: 1px solid rgba(var(--hi-rgb), 0.4); }
.abio-bio-text { flex: 1 1 280px; min-width: 0; line-height: 1.7; white-space: pre-line; }
.abio-empty { padding: 1.5rem 0; color: rgba(var(--gold-rgb), 0.7); }
@media (max-width: 640px) { .abio-name { display: block; } .abio-overlay { padding-top: 5rem; } }
`;

export default function ArtistBioscope() {
  const navigate = useNavigate();
  const { artistId } = useParams();
  const [artist, setArtist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [open, setOpen] = useState(null);       // 'story' | 'biography' | 'music' | null
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [a, v] = await Promise.all([
        supabase.from('artists').select('id,name,tagline,genre,bio,photo_url').eq('id', artistId).maybeSingle(),
        supabase.from('artist_videos').select('*').eq('artist_id', artistId).order('sort_order').order('created_at'),
      ]);
      if (cancelled) return;
      setArtist(a.data || null);
      setVideos(v.data || []);
    })();
    return () => { cancelled = true; };
  }, [artistId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const name = artist?.name || 'this artist';
  const section = SECTIONS.find((s) => s.key === open);
  const list = section ? videos.filter((v) => String(v.kind || '').toLowerCase() === section.kind) : [];

  const openSection = (key) => {
    const s = SECTIONS.find((x) => x.key === key);
    const first = videos.find((v) => String(v.kind || '').toLowerCase() === s.kind) || null;
    setCurrent(first);
    setOpen(key);
  };

  const id = current ? youtubeId(current.video_url) : null;
  const hotspot = (extra) => ({ position: 'absolute', ...extra });

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgb(var(--shade-rgb))' }}>
      <style>{css}</style>
      <div className="abio-stage" style={{ backgroundImage: `url(${roomImage})` }}>
        {SECTIONS.map((s) => (
          <button key={s.key} type="button" className="abio-hot" style={hotspot(s.box)} onClick={() => openSection(s.key)} aria-label={`${s.label} of ${name}`}>
            <span className="abio-tag">{s.label}</span>
          </button>
        ))}
        {/* MENU and EXPLORE are painted on the artwork */}
        <button type="button" className="abio-hot" style={hotspot({ left: '37.8%', top: '90.5%', width: '11.7%', height: '5.5%' })} onClick={() => navigate(`/artist/${artistId}`)} aria-label="Back to artist" />
        <button type="button" className="abio-hot" style={hotspot({ left: '51%', top: '90.5%', width: '11.7%', height: '5.5%' })} onClick={() => navigate(`/music?artist=${encodeURIComponent(artist?.name || '')}`)} aria-label="Explore music" />
        {artist && <div className="abio-name">{artist.name} · Bioscope</div>}
      </div>

      {section && (
        <div className="abio-overlay" onClick={() => setOpen(null)}>
          <div className="abio-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={section.label}>
            <button type="button" className="abio-close" onClick={() => setOpen(null)} aria-label="Close">✕</button>
            <span className="abio-eyebrow">🎬 {section.label}</span>
            <h2>{artist?.name || ''}</h2>

            {section.key === 'biography' && (
              <div className="abio-bio">
                {artist?.photo_url && <img src={artist.photo_url} alt={artist.name} />}
                <div className="abio-bio-text">
                  {artist?.tagline && <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 0.75rem' }}>{artist.tagline}</p>}
                  {artist?.bio ? artist.bio : <span className="abio-empty">The biography is coming soon.</span>}
                </div>
              </div>
            )}

            {current && (
              <>
                <div className="abio-screen" style={{ marginTop: section.key === 'biography' ? '1.5rem' : 0 }}>
                  {id ? (
                    <iframe key={id} src={`https://www.youtube-nocookie.com/embed/${id}`} title={current.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
                  ) : (
                    <div className="abio-fallback">
                      <span>This video opens on another site.</span>
                      <a href={current.video_url} target="_blank" rel="noreferrer">Watch “{current.title}”</a>
                    </div>
                  )}
                </div>
                <h3 className="abio-now">{current.title}</h3>
                {current.description && <p className="abio-desc">{current.description}</p>}
              </>
            )}

            {list.length === 0 && section.key !== 'biography' && (
              <p className="abio-empty">{section.label} from {name} is coming soon.</p>
            )}

            {list.length > 1 && (
              <div className="abio-grid">
                {list.map((v) => {
                  const vid = youtubeId(v.video_url);
                  const thumb = v.thumbnail_url || (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : '');
                  return (
                    <button key={v.id} type="button" className="abio-card" aria-current={current?.id === v.id} onClick={() => setCurrent(v)}>
                      <div className="abio-thumb" style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}>{!thumb && '▶'}</div>
                      <p className="abio-card-title">{v.title}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
