import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { fetchAdminAnalyticsSummary } from '../lib/admin-api';
import { sessionStatusLabel } from '../lib/status';

function toStartOfDayIso(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function toEndOfDayIso(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

export function AdminAnalyticsPage() {
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

  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, []);

  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [includeTop, setIncludeTop] = useState(false);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchAdminAnalyticsSummary>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fromD = new Date(from);
      const toD = new Date(to);
      if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
        throw new Error('Nieprawidłowe daty');
      }
      const res = await fetchAdminAnalyticsSummary(
        toStartOfDayIso(fromD),
        toEndOfDayIso(toD),
        getToken,
        includeTop,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <p className="muted">
        <Link to="/admin">← Panel admin</Link>
      </p>
      <h1>Analityka sesji</h1>
      <p className="muted small">
        Zakres według <code>created_at</code> w bazie. Top użytkowników (Auth0 sub) — dane wrażliwe;
        domyślnie wyłączone.
      </p>

      <form className="card admin-form" onSubmit={onSubmit}>
        <div className="admin-inline-grant">
          <label>
            Od{' '}
            <input className="input input--date" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </label>
          <label>
            Do{' '}
            <input className="input input--date" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={includeTop}
              onChange={e => setIncludeTop(e.target.checked)}
            />
            Pokaż top 20 userId
          </label>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? '…' : 'Pobierz'}
          </button>
        </div>
      </form>

      {error ? (
        <div className="card card--error" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {data ? (
        <div className="stack" style={{ marginTop: '1rem' }}>
          <section className="card">
            <h2>Wg statusu</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Liczba</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byStatus.map(row => (
                    <tr key={row.status}>
                      <td>
                        <span className={`badge badge--${row.status.toLowerCase()}`}>
                          {sessionStatusLabel(row.status)}
                        </span>
                      </td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2>Wg dnia</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dzień (UTC)</th>
                    <th>Liczba</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDay.map(row => (
                    <tr key={row.day}>
                      <td>
                        <code className="small">{row.day}</code>
                      </td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {data.topUserIds?.length ? (
            <section className="card">
              <h2>Top userId</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>userId</th>
                      <th>Sesje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUserIds.map(row => (
                      <tr key={row.userId}>
                        <td>
                          <code className="small">{row.userId}</code>
                        </td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
