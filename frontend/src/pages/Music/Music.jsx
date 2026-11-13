import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Music.css';
import musicBgImage from '../../assets/images/Music Back.jpg';

const API_BASE = import.meta.env.VITE_API_URL || '';
const DEEZER_SEARCH_URL = `${API_BASE}/api/deezer/search?q=`;
const GENRES = ['Afrobeats', 'Amapiano', 'Afro Soul', 'Hip Hop', 'R&B', 'Gospel'];

function formatTime(time) {
  if (!Number.isFinite(time)) return '0:00';
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function Music() {
  const navigate = useNavigate();
  const location = useLocation();
  const artistFromUrl = new URLSearchParams(location.search).get('artist');

  const [searchQuery, setSearchQuery] = useState(artistFromUrl || '');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasQuery = searchQuery.trim() !== '';

  // Debounced search through the backend Deezer proxy
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(
          `${DEEZER_SEARCH_URL}${encodeURIComponent(query)}&limit=30`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Search failed (${response.status})`);
        const data = await response.json();
        if (data.data && data.data.length) {
          setSearchResults(
            data.data.map((track) => ({
              id: track.id,
              title: track.title,
              artist: track.artist.name,
              album: track.album.title,
              duration: track.duration,
              preview: track.preview,
              cover_small: track.album.cover_small,
              cover_medium: track.album.cover_medium,
            }))
          );
        } else {
          setSearchResults([]);
          setError('No songs found. Try a different search.');
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        setError('Failed to search. Please try again.');
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const visibleResults = hasQuery ? searchResults : [];
  const visibleError = hasQuery ? error : '';

  const selectTrack = (track) => {
    const idx = visibleResults.findIndex((t) => t.id === track.id);
    if (idx === -1) return;
    navigate('/now-playing', {
      state: { playlist: visibleResults, trackIndex: idx, shuffle: false, repeat: 'off' },
    });
  };

  return (
    <div className="music-page" style={{ backgroundImage: `url(${musicBgImage})` }}>
      <div className="music-overlay" />
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />

      <div className="music-content">
        <header className="music-header">
          <div className="header-inner">
            <div className="music-eyebrow">
              <span className="eyebrow-dot" />
              Kwa Khanye
            </div>
            <h1 className="music-title">
              {artistFromUrl ? `Songs by ${artistFromUrl}` : 'The Music Kraal'}
            </h1>
            <p className="music-subtitle">
              {artistFromUrl
                ? `Search within ${artistFromUrl}'s discography or type a new query`
                : 'Search any song in the world and play 30 second previews'}
            </p>
            <div className="music-search-wrap">
              <span className="music-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className="music-search"
                aria-label="Search songs"
                placeholder={artistFromUrl ? `Search ${artistFromUrl}'s songs…` : 'Search: Burna Boy, Tyla, Kabza De Small…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </header>

        {visibleError && (
          <div className="error-banner" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {visibleError}
          </div>
        )}

        {loading && hasQuery && (
          <div className="loading-container">
            <div className="loading-spinner"><span /><span /><span /></div>
            <p className="loading-text">Finding your sound…</p>
          </div>
        )}

        {!(loading && hasQuery) && (
          <div className="music-tracklist">
            {!hasQuery && (
              <div className="welcome-state">
                <div className="welcome-grid">
                  {GENRES.map((genre) => (
                    <button key={genre} className="genre-pill" onClick={() => setSearchQuery(genre)}>
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {visibleResults.length > 0 && (
              <div className="tracklist-body">
                <div className="tracklist-meta">
                  <span className="tracklist-count">{visibleResults.length} tracks</span>
                </div>
                <div className="tracklist-header">
                  <span className="th-num">#</span>
                  <span className="th-title">Title</span>
                  <span className="th-artist">Artist</span>
                  <span className="th-album">Album</span>
                  <span className="th-dur">Time</span>
                </div>
                <div className="tracklist-rows">
                  {visibleResults.map((track, idx) => (
                    <button
                      type="button"
                      key={track.id}
                      className="track-item"
                      onClick={() => selectTrack(track)}
                    >
                      <div className="track-num"><span className="idx-num">{idx + 1}</span></div>
                      <div className="track-info-cell">
                        {track.cover_small && <img className="track-thumb" src={track.cover_small} alt="" />}
                        <span className="track-title">{track.title}</span>
                      </div>
                      <div className="track-artist-cell">{track.artist}</div>
                      <div className="track-album-cell">{track.album}</div>
                      <div className="track-dur-cell">{formatTime(track.duration)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Music;
