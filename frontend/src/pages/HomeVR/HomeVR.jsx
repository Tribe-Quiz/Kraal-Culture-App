// HomeVR.jsx — full-screen background image, no header, only hotspots
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import homeVRImage from '../../assets/images/HomeVR.png'; // adjust path if needed

export default function HomeVR() {
  const navigate = useNavigate();
  const [hoverNft, setHoverNft] = useState(false);
  const [hoverStore, setHoverStore] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/login', { replace: true });
    };
    checkAuth();
  }, [navigate]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgb(var(--shade-rgb))',
    }}>
    {/* The stage keeps the artwork's aspect ratio so the percentage-based hotspots stay
        aligned on every screen size (a cropped background would shift them on phones). */}
    <div style={{
      position: 'relative',
      aspectRatio: '1408 / 768',
      width: 'min(100vw, calc(100vh * 1408 / 768))',
      backgroundImage: `url(${homeVRImage})`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    }}>
      {/* NFT FRAME HOTSPOT (left) */}
      <div
        onClick={() => navigate('/nft')}
        onMouseEnter={() => setHoverNft(true)}
        onMouseLeave={() => setHoverNft(false)}
        style={{
          position: 'absolute',
          left: '8.5%',
          top: '25.4%',
          width: '39.1%',
          height: '47.5%',
          zIndex: 20,
          cursor: 'pointer',
          background: hoverNft
            ? 'radial-gradient(ellipse at center, rgba(232,168,76,0.18) 0%, rgba(198,122,52,0.08) 60%, transparent 100%)'
            : 'transparent',
          boxShadow: hoverNft
            ? 'inset 0 0 40px rgba(232,168,76,0.25), 0 0 60px rgba(198,122,52,0.2)'
            : 'none',
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
          borderRadius: '2px',
        }}
      >
        {/* floating label */}
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 14px)',
          left: '50%',
          transform: hoverNft ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(8px)',
          opacity: hoverNft ? 1 : 0,
          transition: 'all 0.35s ease',
          pointerEvents: 'none',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}>
          <div style={{
            background: 'rgba(var(--shade-rgb), 0.92)',
            border: '1px solid rgba(198,122,52,0.6)',
            borderRadius: '8px',
            padding: '0.5rem 1.25rem',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.1rem, 2vw, 1.6rem)',
              fontWeight: 700,
              color: 'rgb(var(--gold-rgb))',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>NFT Gallery</div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              color: '#c67a34',
              textTransform: 'uppercase',
              marginTop: '0.1rem',
            }}>Click to Enter →</div>
          </div>
          <div style={{
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid rgba(198,122,52,0.6)',
            margin: '0 auto',
          }} />
        </div>

        {/* corner accents */}
        {hoverNft && <>
          <div style={{ position:'absolute', top:8, left:8, width:20, height:20, borderTop:'2px solid #e8a84c', borderLeft:'2px solid #e8a84c', opacity:0.8 }} />
          <div style={{ position:'absolute', top:8, right:8, width:20, height:20, borderTop:'2px solid #e8a84c', borderRight:'2px solid #e8a84c', opacity:0.8 }} />
          <div style={{ position:'absolute', bottom:8, left:8, width:20, height:20, borderBottom:'2px solid #e8a84c', borderLeft:'2px solid #e8a84c', opacity:0.8 }} />
          <div style={{ position:'absolute', bottom:8, right:8, width:20, height:20, borderBottom:'2px solid #e8a84c', borderRight:'2px solid #e8a84c', opacity:0.8 }} />
        </>}
      </div>

      {/* ONLINE STORE FRAME HOTSPOT (right) */}
      <div
        onClick={() => navigate('/store')}
        onMouseEnter={() => setHoverStore(true)}
        onMouseLeave={() => setHoverStore(false)}
        style={{
          position: 'absolute',
          left: '54.7%',
          top: '25.4%',
          width: '30.9%',
          height: '47.5%',
          zIndex: 20,
          cursor: 'pointer',
          background: hoverStore
            ? 'radial-gradient(ellipse at center, rgba(232,168,76,0.18) 0%, rgba(198,122,52,0.08) 60%, transparent 100%)'
            : 'transparent',
          boxShadow: hoverStore
            ? 'inset 0 0 40px rgba(232,168,76,0.25), 0 0 60px rgba(198,122,52,0.2)'
            : 'none',
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
          borderRadius: '2px',
        }}
      >
        {/* floating label */}
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 14px)',
          left: '50%',
          transform: hoverStore ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(8px)',
          opacity: hoverStore ? 1 : 0,
          transition: 'all 0.35s ease',
          pointerEvents: 'none',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}>
          <div style={{
            background: 'rgba(var(--shade-rgb), 0.92)',
            border: '1px solid rgba(198,122,52,0.6)',
            borderRadius: '8px',
            padding: '0.5rem 1.25rem',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.1rem, 2vw, 1.6rem)',
              fontWeight: 700,
              color: 'rgb(var(--gold-rgb))',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>Online Store</div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              color: '#c67a34',
              textTransform: 'uppercase',
              marginTop: '0.1rem',
            }}>Click to Enter →</div>
          </div>
          <div style={{
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid rgba(198,122,52,0.6)',
            margin: '0 auto',
          }} />
        </div>

        {/* corner accents */}
        {hoverStore && <>
          <div style={{ position:'absolute', top:8, left:8, width:20, height:20, borderTop:'2px solid #e8a84c', borderLeft:'2px solid #e8a84c', opacity:0.8 }} />
          <div style={{ position:'absolute', top:8, right:8, width:20, height:20, borderTop:'2px solid #e8a84c', borderRight:'2px solid #e8a84c', opacity:0.8 }} />
          <div style={{ position:'absolute', bottom:8, left:8, width:20, height:20, borderBottom:'2px solid #e8a84c', borderLeft:'2px solid #e8a84c', opacity:0.8 }} />
          <div style={{ position:'absolute', bottom:8, right:8, width:20, height:20, borderBottom:'2px solid #e8a84c', borderRight:'2px solid #e8a84c', opacity:0.8 }} />
        </>}
      </div>

      {/* BOTTOM HINT */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        textAlign: 'center',
        pointerEvents: 'none',
        animation: 'pulseHint 2.5s ease-in-out infinite',
      }}>
        <style>{`
          @keyframes pulseHint {
            0%, 100% { opacity: 0.5; transform: translateX(-50%) translateY(0); }
            50% { opacity: 1; transform: translateX(-50%) translateY(-4px); }
          }
        `}</style>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.72rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'rgba(var(--gold-rgb), 0.8)',
          margin: 0,
          textShadow: '0 1px 4px black',
        }}>Tap or hover over a frame</p>
      </div>
    </div>
    </div>
  );
}