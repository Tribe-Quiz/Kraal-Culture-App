import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useSession } from '../../SessionContext';

const BUCKET = 'user-music';
const MAX_BYTES = 20 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60;
const EXT_TYPES = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
  ogg: 'audio/ogg', webm: 'audio/webm', flac: 'audio/flac',
};
const ALLOWED = new Set([...Object.values(EXT_TYPES), 'audio/x-m4a', 'audio/x-wav']);

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i > -1 ? name.slice(i + 1).toLowerCase() : '';
}

function detectType(file) {
  if (file.type && ALLOWED.has(file.type)) return file.type;
  return EXT_TYPES[extOf(file.name)] || null; // some browsers report '' for m4a/flac
}

function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (v) => { URL.revokeObjectURL(url); resolve(v); };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

function formatTime(sec) {
  if (!Number.isFinite(sec)) return '–:––';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatSize(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function MyUploads() {
  const navigate = useNavigate();
  const session = useSession();
  const user = session?.user;
  const fileRef = useRef(null);

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState(
    user?.user_metadata?.username || user?.user_metadata?.full_name || ''
  );
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    const { data, error } = await supabase
      .from('user_tracks')
      .select('id, title, artist, storage_path, duration_sec, size_bytes, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError('Could not load your uploads. Has supabase/schema.sql been run on this project?');
      setLoading(false);
      return;
    }
    let urls = {};
    if (data.length) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(data.map((t) => t.storage_path), SIGNED_URL_SECONDS);
      (signed || []).forEach((s) => { if (s.path && s.signedUrl) urls[s.path] = s.signedUrl; });
    }
    setTracks(
      data.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: 'My upload',
        duration: t.duration_sec,
        size: t.size_bytes,
        path: t.storage_path,
        preview: urls[t.storage_path] || null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    setFormError('');
    setNotice('');
    if (!f) return;
    if (!detectType(f)) {
      setFormError('Unsupported file. Use MP3, M4A, AAC, WAV, OGG, WEBM or FLAC.');
      e.target.value = '';
      return;
    }
    if (f.size > MAX_BYTES) {
      setFormError('That file is over 20 MB.');
      e.target.value = '';
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file || !user || busy) return;
    const t = title.trim();
    const a = artist.trim();
    if (!t || !a) { setFormError('Add a title and an artist.'); return; }

    setBusy(true);
    setFormError('');
    setNotice('');
    const mime = detectType(file);
    const path = `${user.id}/${crypto.randomUUID()}.${extOf(file.name) || 'mp3'}`;
    try {
      const duration = await readDuration(file);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: mime, cacheControl: '3600', upsert: false });
      if (upErr) throw new Error(upErr.message);

      const { error: rowErr } = await supabase.from('user_tracks').insert({
        title: t.slice(0, 120),
        artist: a.slice(0, 120),
        storage_path: path,
        mime_type: mime,
        size_bytes: file.size,
        duration_sec: duration,
      });
      if (rowErr) {
        await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphaned file
        throw new Error(rowErr.message);
      }

      setFile(null);
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      setNotice('Uploaded. It is private to you.');
      await load();
    } catch (err) {
      setFormError(`Upload failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (track) => {
    if (!window.confirm(`Delete "${track.title}"? This cannot be undone.`)) return;
    const { error: rowErr } = await supabase.from('user_tracks').delete().eq('id', track.id);
    if (rowErr) { setFormError(`Could not delete: ${rowErr.message}`); return; }
    await supabase.storage.from(BUCKET).remove([track.path]);
    setTracks((prev) => prev.filter((x) => x.id !== track.id));
  };

  const play = (idx) => {
    const playable = tracks.filter((t) => t.preview);
    const idxInPlayable = playable.findIndex((t) => t.id === tracks[idx].id);
    if (idxInPlayable === -1) return;
    navigate('/now-playing', {
      state: { playlist: playable, trackIndex: idxInPlayable, shuffle: false, repeat: 'off', returnTo: '/music?tab=uploads' },
    });
  };

  return (
    <div className="uploads">
      <form className="upload-form" onSubmit={submit}>
        <h2 className="upload-heading">Upload a track</h2>
        <p className="upload-hint">MP3, M4A, AAC, WAV, OGG, WEBM or FLAC, up to 20 MB. Only you can hear your uploads. Upload music you have the right to share.</p>

        <label className="upload-drop">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.webm,.flac"
            onChange={pickFile}
            disabled={busy}
          />
          <span>{file ? `${file.name} · ${formatSize(file.size)}` : 'Choose an audio file'}</span>
        </label>

        <div className="upload-fields">
          <input
            className="upload-input"
            aria-label="Track title"
            placeholder="Title"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
          />
          <input
            className="upload-input"
            aria-label="Artist"
            placeholder="Artist"
            maxLength={120}
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            disabled={busy}
          />
        </div>

        {formError && <div className="upload-msg upload-msg--error" role="alert">{formError}</div>}
        {notice && <div className="upload-msg upload-msg--ok" role="status">{notice}</div>}

        <button className="upload-submit" type="submit" disabled={!file || busy}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      <div className="uploads-list">
        <h2 className="upload-heading">Your uploads</h2>
        {loading && <p className="upload-hint">Loading…</p>}
        {loadError && <div className="upload-msg upload-msg--error" role="alert">{loadError}</div>}
        {!loading && !loadError && tracks.length === 0 && (
          <p className="upload-hint">Nothing here yet. Upload your first track above.</p>
        )}
        {tracks.map((track, idx) => (
          <div className="upload-row" key={track.id}>
            <button
              type="button"
              className="upload-play"
              onClick={() => play(idx)}
              disabled={!track.preview}
              aria-label={`Play ${track.title}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20" /></svg>
            </button>
            <div className="upload-meta">
              <span className="upload-title">{track.title}</span>
              <span className="upload-sub">{track.artist} · {formatTime(track.duration)} · {formatSize(track.size)}</span>
            </div>
            <button type="button" className="upload-delete" onClick={() => remove(track)} aria-label={`Delete ${track.title}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
