import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ApiSessionDetail } from '../lib/api';
import { fetchSession } from '../lib/api';
import { sessionStatusLabel } from '../lib/status';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pl-PL', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getAccessTokenSilently } = useAuth0();
  const [session, setSession] = useState<ApiSessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        const data = await fetchSession(sessionId, token);
        if (!cancelled) setSession(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Nie udało się wczytać sesji.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, getAccessTokenSilently]);

  if (error) {
    return (
      <div className="page">
        <Link to="/sessions" className="link back-link">
          ← Lista sesji
        </Link>
        <div className="card card--error">
          <h1>Błąd</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page">
        <p className="muted">Wczytywanie sesji…</p>
      </div>
    );
  }

  const analysis = session.analysis;

  return (
    <div className="page">
      <Link to="/sessions" className="link back-link">
        ← Lista sesji
      </Link>

      <div className="page__head">
        <h1>Sesja</h1>
        <p className="muted">{formatDate(session.createdAt)}</p>
      </div>

      <div className="meta-grid">
        <div className="meta-item">
          <span className="meta-label">Pacjent</span>
          <span>{session.patient?.name?.trim() || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Status</span>
          <span className={`badge badge--${session.status.toLowerCase()}`}>
            {sessionStatusLabel(session.status)}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Język podsumowania</span>
          <span>{session.summaryLanguage ?? '—'}</span>
        </div>
      </div>

      {analysis ? (
        <div className="stack">
          <section className="card card--warm">
            <h2>Wątki bieżące</h2>
            <ul className="threads">
              {analysis.threads.map((t, i) => (
                <li key={`${t.label}-${i}`} className="thread-row">
                  <div className="thread-row__head">
                    <span>{t.label}</span>
                    <span className="muted">{Math.round(t.percent)}%</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.min(100, Math.max(0, t.percent))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="next-box">
              <strong>Następna sesja: </strong>
              {analysis.nextSessionSuggestion}
            </div>
          </section>

          <section className="card">
            <h2>Notatka SOAP</h2>
            <div className="soap">
              <SoapRow letter="S" text={analysis.soap.subjective} />
              <SoapRow letter="O" text={analysis.soap.objective} />
              <SoapRow letter="A" text={analysis.soap.assessment} />
              <SoapRow letter="P" text={analysis.soap.plan} last />
            </div>
          </section>
        </div>
      ) : null}

      <section className="card">
        <h2>{analysis ? 'Pełny tekst podsumowania' : 'Podsumowanie'}</h2>
        {session.interpretation ? (
          <pre className="interpretation">{session.interpretation}</pre>
        ) : (
          <p className="muted">Brak podsumowania.</p>
        )}
      </section>

      {session.text ? (
        <section className="card">
          <h2>Transkrypcja</h2>
          <pre className="interpretation">{session.text}</pre>
        </section>
      ) : null}
    </div>
  );
}

function SoapRow({
  letter,
  text,
  last,
}: {
  letter: string;
  text: string;
  last?: boolean;
}) {
  return (
    <div className={`soap-row${last ? ' soap-row--last' : ''}`}>
      <span className="soap-letter">{letter}</span>
      <p className="soap-text">{text}</p>
    </div>
  );
}
