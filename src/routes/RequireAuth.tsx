import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

export function RequireAuth() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void loginWithRedirect({
        appState: { returnTo: `${window.location.pathname}${window.location.search}` },
      });
    }
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  if (isLoading) {
    return (
      <div className="page page--center">
        <p className="muted">Ładowanie…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page page--center">
        <p className="muted">Przekierowanie do logowania…</p>
      </div>
    );
  }

  return <Outlet />;
}
