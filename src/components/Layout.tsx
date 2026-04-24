import { useAuth0 } from '@auth0/auth0-react';
import { Link, Outlet } from 'react-router-dom';

import { isStaffAdmin } from '../lib/admin-gate';

export function Layout() {
  const { user, logout } = useAuth0();
  const showAdmin = isStaffAdmin(user?.sub);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <Link to="/sessions" className="app-logo">
            Cognic
          </Link>
          <span className="app-tag">Web — podgląd sesji</span>
          {showAdmin ? (
            <nav className="app-header__nav">
              <Link to="/admin">Admin</Link>
            </nav>
          ) : null}
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
