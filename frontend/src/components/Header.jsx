import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

function getDisplayName(session) {
  if (!session) return null;
  const meta = session.user?.user_metadata || {};
  return meta.username || meta.full_name || meta.name || session.user?.email?.split('@')[0] || 'Member';
}

function getAvatarUrl(session) {
  return session?.user?.user_metadata?.avatar_url || null;
}

// Where the back arrow goes. Fixed parents (not browser history) so it never leaves the app,
// except on an artist profile where "back" should return to whichever list you came from.
function getBackTarget(pathname, state) {
  if (pathname === '/') return null;
  const artists = pathname.match(/^\/country\/([^/]+)\/culture\/[^/]+\/artists\/?$/);
  if (artists) return `/country/${artists[1]}`;
  if (/^\/country\/[^/]+\/?$/.test(pathname)) return '/';
  if (pathname.startsWith('/artist/')) return -1;
  if (pathname === '/now-playing') return state?.returnTo || '/music';
  if (pathname === '/nft' || pathname === '/store') return '/homevr';
  if (['/music', '/homevr', '/bioscope'].includes(pathname)) return '/';
  return null;
}

function AvatarIcon({ session, size = 20 }) {
  const url = getAvatarUrl(session);
  const name = getDisplayName(session) || '?';
  const initial = name.charAt(0).toUpperCase();

  if (url) {
    return (
      <img 
        src={url} 
        alt={name} 
        style={{
          width: size, 
          height: size, 
          borderRadius: '50%', 
          objectFit: 'cover',
        }} 
      />
    );
  }

  return (
    <div style={{
      width: size, 
      height: size, 
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #8B6914, #c67a34)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize: size * 0.45, 
      color: '#fff', 
      flexShrink: 0,
    }}>{initial}</div>
  );
}

export default function Header({ session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const backTarget = getBackTarget(location.pathname, location.state);
  const goBack = () => (backTarget === -1 ? (window.history.length > 1 ? navigate(-1) : navigate('/')) : navigate(backTarget));
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploading, setUploading] = useState(false);
  const displayName = getDisplayName(session);

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { 
      alert('❌ File is too large. Max 2MB.'); 
      return; 
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { 
      alert('❌ Please upload a JPEG, PNG, GIF, or WEBP image.'); 
      return; 
    }

    setUploading(true);
    try {
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });
        
      if (error) throw new Error(`Upload failed: ${error.message}`);
      
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.auth.updateUser({ data: { avatar_url: urlData.publicUrl } });
      await supabase.auth.refreshSession();
      window.location.reload();
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setUploading(false);
      setMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setMenuOpen(false);
    setSigningOut(false);
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="header-left-group">
        {backTarget !== null && (
          <button type="button" className="header-back" onClick={goBack} aria-label="Go back" title="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <Link to="/" className="brand-logo-text">Kraal Culture</Link>
      </div>

      <nav className="nav-container">
        <ul className="nav-list">
          <li><ThemeToggle /></li>
          {session ? (
            <>
              <li>
                <button
                  type="button"
                  className="user-profile-badge"
                  onClick={() => setMenuOpen(o => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Account menu for ${displayName}`}
                >
                  <span className="profile-name">{displayName}</span>
                  <AvatarIcon session={session} size={34} />
                  <span className="arrow-indicator" aria-hidden="true">{menuOpen ? '▲' : '▼'}</span>
                </button>
              </li>
              <li>
                <button onClick={handleSignOut} disabled={signingOut} className="nav-action-btn logout-btn">
                  <LogOut size={13} strokeWidth={2.5} />
                  <span className="nav-label">Logout</span>
                </button>
              </li>
            </>
          ) : (
            <li className="auth-links">
              <Link to="/login" className="auth-nav-link">Sign In</Link>
              <Link to="/signup" className="auth-nav-link join-btn">Join</Link>
            </li>
          )}
        </ul>
      </nav>

      {menuOpen && session && (
        <div className="profile-dropdown-menu">
          <div className="dropdown-info-section">
            <div className="dropdown-label">Signed in as</div>
            <div className="dropdown-username">{displayName}</div>
          </div>
          <div style={{ padding: '0.4rem 1rem' }}>
            <label htmlFor="avatar-upload" className="dropdown-action-item" style={{ cursor: 'pointer' }}>
              {uploading ? 'Uploading…' : '🖼 Change Avatar'}
            </label>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarUpload} 
              disabled={uploading} 
              style={{ display: 'none' }} 
            />
          </div>
          <button onClick={handleSignOut} disabled={signingOut} className="dropdown-signout-btn">
            {signingOut ? 'Signing out…' : '↪ Sign Out'}
          </button>
        </div>
      )}
    </header>
  );
}