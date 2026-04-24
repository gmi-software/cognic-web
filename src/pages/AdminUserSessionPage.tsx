import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ApiSessionDetail, TranscriptionTurn } from '../lib/api';
import {
  type AdminSessionDiagnostics,
  fetchAdminSessionDiagnostics,
  fetchAdminUserSessionDetail,
} from '../lib/admin-api';
import {
  isAwaitingFirstPipelineSummary,
  isErrorLikeSessionStatus,
  shouldRegenerateSessionWeb,
} from '../lib/session-detail-ui';
import { sessionStatusLabel } from '../lib/status';
import {
  buildSpeakerOrder,
  buildTranscriptionClipboardText,
  computeSpeakerStats,
  formatSecondsAsClock,
  formatTimeRange,
} from '../lib/transcription-stats';

const COPY = {
  transcriptionTitle: 'Transkrypcja',
  transcriptionSpeakers: 'Czas wypowiedzi wg mówców',
  speakerLabel: (n: number) => `Mówca ${n}`,
  segmentPercent: (p: number) => `${p}% sesji`,
  copyTranscription: 'Kopiuj transkrypcję',
  copied: 'Skopiowano do schowka.',
  summaryEmpty: 'Brak podsumowania.',
} as const;

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

function DiarizedTranscription({
  turns,
  durationMs,
}: {
  turns: TranscriptionTurn[];
  durationMs: number;
}) {
  const speakerStats = useMemo(
    () => computeSpeakerStats(turns, durationMs),
    [turns, durationMs],
  );

  const speakerOrderMap = useMemo(() => buildSpeakerOrder(turns), [turns]);

  const sessionSec = durationMs > 0 ? durationMs / 1000 : 0;

  return (
    <div className="diarized">
      <h3 className="diarized__sub">{COPY.transcriptionSpeakers}</h3>
      <ul className="speaker-chips">
        {speakerStats.map(row => (
          <li
            key={row.speakerKey}
            className={`speaker-chip speaker-chip--${row.order % 3}`}>
            <span className="speaker-chip__name">{COPY.speakerLabel(row.order)}</span>
            <span className="speaker-chip__meta">
              {formatSecondsAsClock(row.seconds)}
              {row.percent != null ? ` · ${Math.round(row.percent)}% sesji` : null}
            </span>
          </li>
        ))}
      </ul>
      <ul className="turn-list">
        {turns.map((seg, idx) => {
          const ord = speakerOrderMap.get(seg.speaker) ?? 0;
          const dur = Math.max(0, seg.endSec - seg.startSec);
          const segmentPercent =
            sessionSec > 0 ? Math.min(100, (dur / sessionSec) * 100) : null;
          return (
            <li
              key={`${seg.startSec}-${seg.endSec}-${idx}`}
              className={`turn-segment turn-segment--${ord % 3}`}>
              <div className="turn-segment__speaker">{COPY.speakerLabel(ord)}</div>
              <div className="turn-segment__meta">
                {formatTimeRange(seg.startSec, seg.endSec)}
                {' · '}
                {formatSecondsAsClock(dur)}
                {segmentPercent != null
                  ? ` · ${COPY.segmentPercent(Math.round(segmentPercent))}`
                  : null}
              </div>
              <p className="turn-segment__text">{seg.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AdminTranscriptionSection({
  session,
  onCopy,
  copyHint,
}: {
  session: ApiSessionDetail;
  onCopy: () => void;
  copyHint: string | null;
}) {
  const turns = session.transcriptionTurns;
  const hasDiarized = Boolean(turns && turns.length > 0);
  const needRegenerate = shouldRegenerateSessionWeb(session);
  const plainOk = Boolean(session.text?.trim()) && !needRegenerate;

  if (!plainOk && !hasDiarized) {
    return (
      <section className="card">
        <h2>{COPY.transcriptionTitle}</h2>
        <p className="muted">
          {session.status === 'REPROCESSING'
            ? 'Transkrypcja pojawi się po zakończeniu przetwarzania.'
            : 'Brak transkrypcji.'}
        </p>
      </section>
    );
  }

  if (hasDiarized && turns) {
    return (
      <section className="card">
        <div className="transcription__head">
          <h2>{COPY.transcriptionTitle}</h2>
          <button type="button" className="btn btn--ghost" onClick={onCopy}>
            {COPY.copyTranscription}
          </button>
        </div>
        {copyHint ? <p className="small muted">{copyHint}</p> : null}
        <DiarizedTranscription turns={turns} durationMs={session.duration ?? 0} />
      </section>
    );
  }

  return (
    <section className="card">
      <div className="transcription__head">
        <h2>{COPY.transcriptionTitle}</h2>
        <button type="button" className="btn btn--ghost" onClick={onCopy}>
          {COPY.copyTranscription}
        </button>
      </div>
      {copyHint ? <p className="small muted">{copyHint}</p> : null}
      <pre className="interpretation">{session.text}</pre>
    </section>
  );
}

export function AdminUserSessionPage() {
  const { userId: userIdParam, sessionId: sessionIdParam } = useParams<{
    userId: string;
    sessionId: string;
  }>();
  const userId = userIdParam ? decodeURIComponent(userIdParam) : '';
  const sessionId = sessionIdParam ? decodeURIComponent(sessionIdParam) : '';

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

  const [session, setSession] = useState<ApiSessionDetail | null>(null);
  const [diag, setDiag] = useState<AdminSessionDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUserSessionDetail(userId, sessionId, getToken);
      setSession(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd wczytywania');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [userId, sessionId, getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDiagnostics = async () => {
    if (!sessionId) return;
    setError(null);
    try {
      const d = await fetchAdminSessionDiagnostics(userId, sessionId, getToken);
      setDiag(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Diagnostyka nieudana');
    }
  };

  const handleCopyTranscription = async () => {
    if (!session) return;
    const text = buildTranscriptionClipboardText(
      session.transcriptionTurns,
      session.text ?? '',
      order => COPY.speakerLabel(order + 1),
    );
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(COPY.copied);
      window.setTimeout(() => setCopyHint(null), 2500);
    } catch {
      setCopyHint('Nie udało się skopiować.');
      window.setTimeout(() => setCopyHint(null), 2500);
    }
  };

  const awaitingPipeline =
    !!session &&
    isAwaitingFirstPipelineSummary(session) &&
    !shouldRegenerateSessionWeb(session) &&
    !(session.interpretation?.trim()) &&
    !isErrorLikeSessionStatus(session.status);

  if (!userId || !sessionId) {
    return (
      <div className="page">
        <p className="muted">Niepełny URL.</p>
        <Link to="/admin">Panel admin</Link>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="page">
        <Link to={`/admin/users/${encodeURIComponent(userId)}`} className="link back-link">
          ← Użytkownik
        </Link>
        <div className="card card--error">
          <h1>Błąd</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (loading && !session) {
    return (
      <div className="page">
        <p className="muted">Wczytywanie…</p>
      </div>
    );
  }

  if (!session) return null;

  const analysis = session.analysis;
  const showTranscription =
    session.saveRecording !== false &&
    (Boolean(session.text?.trim()) || (session.transcriptionTurns?.length ?? 0) > 0);

  return (
    <div className="page">
      <Link to={`/admin/users/${encodeURIComponent(userId)}`} className="link back-link">
        ← Użytkownik
      </Link>

      <div className="page__head page__head--row">
        <div>
          <h1>Sesja (admin)</h1>
          <p className="muted">{formatDate(session.createdAt)}</p>
        </div>
        <div className="admin-session-actions">
          <button type="button" className="btn btn--ghost" onClick={() => void load()}>
            Odśwież
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => void onDiagnostics()}>
            Diagnostyka API
          </button>
        </div>
      </div>

      {error ? (
        <p className="muted small" role="alert">
          {error}
        </p>
      ) : null}

      {diag ? (
        <section className="card card--warm">
          <h2>Diagnostyka</h2>
          <pre className="admin-diag-json">{JSON.stringify(diag, null, 2)}</pre>
        </section>
      ) : null}

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
        {awaitingPipeline ? (
          <p className="muted">Sesja jest przetwarzana — odśwież za chwilę.</p>
        ) : session.interpretation?.trim() ? (
          <pre className="interpretation">{session.interpretation}</pre>
        ) : (
          <p className="muted">{COPY.summaryEmpty}</p>
        )}
      </section>

      {showTranscription ? (
        <AdminTranscriptionSection
          session={session}
          onCopy={() => void handleCopyTranscription()}
          copyHint={copyHint}
        />
      ) : null}
    </div>
  );
}
