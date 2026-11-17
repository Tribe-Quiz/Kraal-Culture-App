import { Outlet } from 'react-router-dom';
import Header from './Header';

// Every inner page renders inside <main className="app-main">, which reserves room for the
// floating header (--header-offset) so pages never need their own top padding for it.
export default function Layout({ session, hideHeader = false }) {
  return (
    <div className="app-shell">
      {!hideHeader && <Header session={session} />}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
