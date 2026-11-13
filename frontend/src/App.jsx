import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { SessionContext, useSession } from './SessionContext';

import Layout from './components/Layout';
import HomePage from './components/HomePage';
import CountryPage from './components/CountryPage';
import ArtistsPage from './components/ArtistsPage';
import ArtistProfile from './components/ArtistProfile';

import Music from './pages/Music/Music';
import NowPlaying from './pages/Music/NowPlaying';
import HomeVR from './pages/HomeVR/HomeVR';
import NFTs from './pages/HomeVR/NFTs';
import OnlineStore from './pages/HomeVR/OnlineStore';
import Bioscope from './pages/Bioscope/Bioscope';

import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import {
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/Auth/ForgotPasswordPage';

function ProtectedRoute({ children }) {
  const session = useSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCurrentSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setLoading(false);
    };

    getCurrentSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgb(var(--shade-rgb))',
          color: '#fff',
          fontSize: '20px',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <SessionContext.Provider value={session}>
      <Routes>
        {/* Public Pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Home page – NO Layout wrapper, it renders its own header */}
        <Route path="/" element={<HomePage />} />

        {/* Protected pages with Layout (which renders the header) */}
        <Route element={<Layout session={session} />}>
          <Route
            path="/country/:countryId"
            element={
              <ProtectedRoute>
                <CountryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/country/:countryId/culture/:cultureId/artists"
            element={
              <ProtectedRoute>
                <ArtistsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/music"
            element={
              <ProtectedRoute>
                <Music />
              </ProtectedRoute>
            }
          />
          <Route
            path="/now-playing"
            element={
              <ProtectedRoute>
                <NowPlaying />
              </ProtectedRoute>
            }
          />
          <Route
            path="/homevr"
            element={
              <ProtectedRoute>
                <HomeVR />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nft"
            element={
              <ProtectedRoute>
                <NFTs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/store"
            element={
              <ProtectedRoute>
                <OnlineStore />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bioscope"
            element={
              <ProtectedRoute>
                <Bioscope />
              </ProtectedRoute>
            }
          />
          <Route
            path="/artist/:artistId"
            element={
              <ProtectedRoute>
                <ArtistProfile />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionContext.Provider>
  );
}

export default App;