import { useAuth0 } from '@auth0/auth0-react';
import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  const { user, logout } = useAuth0();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <Link to="/sessions" className="app-logo">
            Cognic
          </Link>
          <span className="app-tag">Web — podgląd sesji</span>
        </div>
        <div className="app-header__user">
          <span className="app-header__email" title={user?.email}>
            {user?.email ?? user?.sub}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              void logout({ logoutParams: { returnTo: window.location.origin } })
            }>
            Wyloguj
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
