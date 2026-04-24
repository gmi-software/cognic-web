import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  fetchAdminUserCredits,
  fetchAdminUserSessions,
  postAdminGrantCredits,
  postAdminReprocessSession,
} from '../lib/admin-api';
import { sessionStatusLabel } from '../lib/status';

export function AdminUserPage() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const userId = userIdParam ? decodeURIComponent(userIdParam) : '';
  const { getAccessTokenSilently } = useAuth0();

  const getToken = useCallback(
    () =>
      getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      }),
    [getAccessTokenSilently],
  );

  const [sessions, setSessions] = useState<Awaited<
    ReturnType<typeof fetchAdminUserSessions>
  > | null>(null);
  const [credits, setCredits] = useState<Awaited<
    ReturnType<typeof fetchAdminUserCredits>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [grantQty, setGrantQty] = useState('10');
  const [grantDays, setGrantDays] = useState('365');
  const [grantBusy, setGrantBusy] = useState(false);
  const [reprocessId, setReprocessId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([
        fetchAdminUserSessions(userId, getToken, { limit: 100, offset: 0 }),
        fetchAdminUserCredits(userId, getToken),
      ]);
      setSessions(s);
      setCredits(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd wczytywania');
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onGrant = async (e: FormEvent) => {
    e.preventDefault();
    const q = Number(grantQty);
    const d = grantDays.trim() ? Number(grantDays) : 365;
    if (!userId || !Number.isFinite(q) || q < 1 || !Number.isFinite(d) || d < 1) return;
    setGrantBusy(true);
    setError(null);
    try {
      await postAdminGrantCredits(userId, { quantity: q, expiresInDays: d }, getToken);
      setGrantQty('10');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać kredytów');
    } finally {
      setGrantBusy(false);
    }
  };

  const onReprocess = async (sessionId: string) => {
    if (!window.confirm('Uruchomić ponowne przetwarzanie tej sesji?')) return;
    setReprocessId(sessionId);
    setError(null);
    try {
      await postAdminReprocessSession(userId, sessionId, getToken);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reprocess nie powiódł się');
    } finally {
      setReprocessId(null);
    }
  };

  if (!userId) {
    return (
      <div className="page">
        <p className="muted">Brak userId w URL.</p>
        <Link to="/admin">Panel admin</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="muted">
        <Link to="/admin">← Panel admin</Link>
        {' · '}
        <Link to="/sessions">Sesje (moje)</Link>
      </p>
      <h1>Użytkownik</h1>
      <pre className="admin-user-id">{userId}</pre>

      {error ? (
        <div className="card card--error" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2>Kredyty sesji</h2>
        {loading && !credits ? (
          <p className="muted">Wczytywanie…</p>
        ) : credits ? (
          <>
            <p>
              <strong>Aktywna suma:</strong> {credits.activeSum}{' '}
              <span className="muted">
                (płatne pakiety: {credits.hasPaidSessions ? 'tak' : 'nie'})
              </span>
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ilość</th>
                    <th>Wygasa</th>
                    <th>Źródło (web_order_line_item_id)</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.packages.map(p => (
                    <tr key={p.id}>
                      <td>{p.quantity}</td>
                      <td>{new Date(p.expireAt).toLocaleString('pl-PL')}</td>
                      <td>
                        <code className="small">{p.webOrderLineItemId}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <form className="admin-inline-grant" onSubmit={onGrant}>
          <label>
            Dodaj
            <input
              className="input input--narrow"
              type="number"
              min={1}
              value={grantQty}
              onChange={e => setGrantQty(e.target.value)}
            />
            sesji, ważność (dni)
            <input
              className="input input--narrow"
              type="number"
              min={1}
              value={grantDays}
              onChange={e => setGrantDays(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={grantBusy}>
            {grantBusy ? 'Zapisywanie…' : 'Dodaj kredyt'}
          </button>
        </form>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <div className="page__head page__head--row">
          <h2>Sesje</h2>
          <button type="button" className="btn btn--ghost" disabled={loading} onClick={() => void reload()}>
            Odśwież
          </button>
        </div>
        {loading && !sessions ? (
          <p className="muted">Wczytywanie…</p>
        ) : sessions?.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Pacjent</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>{new Date(s.createdAt).toLocaleString('pl-PL')}</td>
                    <td>
                      <span className={`badge badge--${s.status.toLowerCase()}`}>
                        {sessionStatusLabel(s.status)}
                      </span>
                    </td>
                    <td>{s.patient?.name?.trim() || '—'}</td>
                    <td>
                      <Link
                        to={`/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(s.id)}`}>
                        Szczegóły
                      </Link>
                      {s.status !== 'REPROCESSING' ? (
                        <>
                          {' · '}
                          <button
                            type="button"
                            className="btn btn--link"
                            disabled={reprocessId === s.id}
                            onClick={() => void onReprocess(s.id)}>
                            {reprocessId === s.id ? '…' : 'Reprocess'}
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Brak sesji.</p>
        )}
      </section>
    </div>
  );
}
