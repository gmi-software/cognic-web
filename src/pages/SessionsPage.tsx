import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApiSessionListItem } from '../lib/api';
import { fetchSessions } from '../lib/api';
import { sessionStatusLabel } from '../lib/status';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pl-PL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function SessionsPage() {
  const { getAccessTokenSilently } = useAuth0();
  const [sessions, setSessions] = useState<ApiSessionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        const data = await fetchSessions(token);
        if (!cancelled) setSessions(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Nie udało się pobrać sesji.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessTokenSilently]);

  if (error) {
    return (
      <div className="page">
        <div className="card card--error">
          <h1>Błąd</h1>
          <p>{error}</p>
          <p className="muted small">
            Sprawdź zmienne środowiskowe (API, Auth0, audience zgodne z API).
          </p>
        </div>
      </div>
    );
  }

  if (!sessions) {
    return (
      <div className="page">
        <p className="muted">Pobieranie listy sesji…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1>Twoje sesje</h1>
        <p className="muted">
          {sessions.length === 0
            ? 'Brak zapisanych sesji.'
            : `Łącznie: ${sessions.length}`}
        </p>
      </div>

      {sessions.length === 0 ? null : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Pacjent</th>
                <th>Status</th>
                <th>Czas nagrania</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>{s.patient?.name?.trim() || '—'}</td>
                  <td>
                    <span className={`badge badge--${s.status.toLowerCase()}`}>
                      {sessionStatusLabel(s.status)}
                    </span>
                  </td>
                  <td>
                    {typeof s.duration === 'number' && s.duration > 0
                      ? `${Math.round(s.duration / 60000)} min`
                      : '—'}
                  </td>
                  <td>
                    <Link className="link" to={`/sessions/${s.id}`}>
                      Szczegóły
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
