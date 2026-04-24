import { useAuth0 } from '@auth0/auth0-react';
import { Link, Outlet } from 'react-router-dom';

import { isStaffAdmin } from '../lib/admin-gate';

export function RequireStaffAdmin() {
  const { user, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="page page--center">
        <p className="muted">Ładowanie…</p>
      </div>
    );
  }

  if (!isStaffAdmin(user?.sub)) {
    return (
      <div className="page page--center">
        <div className="card card--error" style={{ maxWidth: 480 }}>
          <h1>Brak dostępu</h1>
          <p className="muted">
            Ten obszar jest tylko dla kont na liście administratorów (zmienna{' '}
            <code>VITE_ADMIN_AUTH0_SUBS</code> musi zawierać Twój Auth0{' '}
            <code>sub</code>).
          </p>
          <p>
            <Link to="/sessions">Wróć do listy sesji</Link>
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
