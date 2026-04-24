import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ApiSessionDetail, TranscriptionTurn } from '../lib/api';
import { fetchSession } from '../lib/api';
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

const COPY = {
  summaryProcessingTitle: 'Sesja jest przetwarzana',
  summaryProcessingSubtitle:
    'Tworzymy transkrypcję i podsumowanie AI. Zwykle trwa to kilka minut. Użyj przycisku „Odśwież”, aby sprawdzić postęp.',
  summaryReprocessingTitle: 'Sesja jest w trakcie ponownego przetwarzania',
  summaryReprocessingSubtitle:
    'Może to potrwać kilka minut. Odśwież stronę, aby zobaczyć aktualny status.',
  summaryStuckTitle: 'Sesja nie została ukończona w oczekiwanym czasie',
  summaryStuckSubtitle:
    'Odśwież stronę lub uruchom ponowne przetwarzanie w aplikacji mobilnej (zużywa 1 sesję z limitu).',
  summaryPipelineErrorTitle: 'Przetwarzanie nie powiodło się',
  summaryPipelineErrorSubtitle:
    'Sprawdź status powyżej. Możesz ponowić przetwarzanie w aplikacji mobilnej.',
  summaryEmpty: 'Brak podsumowania. Odśwież stronę lub spróbuj ponownie później.',
  transcriptionTitle: 'Transkrypcja',
  transcriptionSpeakers: 'Czas wypowiedzi wg mówców',
  speakerLabel: (n: number) => `Mówca ${n}`,
  segmentPercent: (p: number) => `${p}% sesji`,
  copyTranscription: 'Kopiuj transkrypcję',
  copied: 'Skopiowano do schowka.',
  refresh: 'Odśwież',
  refreshing: 'Odświeżanie…',
} as const;

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getAccessTokenSilently } = useAuth0();
  const [session, setSession] = useState<ApiSessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const loadSession = useCallback(
    async (silent: boolean) => {
      if (!sessionId) return;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        const data = await fetchSession(sessionId, token);
        setSession(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Nie udało się wczytać sesji.');
        if (!silent) setSession(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sessionId, getAccessTokenSilently],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadSession(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadSession]);

  const canReprocessAfterPipelineError = useMemo(() => {
    if (!session || session.interpretation?.trim()) return false;
    if (session.status === 'REPROCESSING') return false;
    return isErrorLikeSessionStatus(session.status);
  }, [session]);

  const needRegenerate = shouldRegenerateSessionWeb(session);

  const awaitingPipeline =
    !!session &&
    isAwaitingFirstPipelineSummary(session) &&
    !needRegenerate &&
    !canReprocessAfterPipelineError;

  const showTranscription =
    session?.saveRecording !== false &&
    (Boolean(session?.text?.trim()) ||
      (session?.transcriptionTurns?.length ?? 0) > 0);

  const handleCopyTranscription = async () => {
    if (!session) return;
    const text = buildTranscriptionClipboardText(
      session.transcriptionTurns,
      session.text ?? '',
      (order) => COPY.speakerLabel(order + 1),
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

  if (error && !session) {
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

  if (loading && !session) {
    return (
      <div className="page">
        <p className="muted">Wczytywanie sesji…</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const analysis = session.analysis;

  return (
    <div className="page">
      <Link to="/sessions" className="link back-link">
        ← Lista sesji
      </Link>

      <div className="page__head page__head--row">
        <div>
          <h1>Sesja</h1>
          <p className="muted">{formatDate(session.createdAt)}</p>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={refreshing}
          onClick={() => void loadSession(true)}>
          {refreshing ? COPY.refreshing : COPY.refresh}
        </button>
      </div>

      {error && session ? (
        <p className="muted small" role="alert">
          {error} ({COPY.refresh})
        </p>
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
        <SummaryBody
          session={session}
          awaitingPipeline={awaitingPipeline}
          needRegenerate={needRegenerate}
          canReprocessAfterPipelineError={canReprocessAfterPipelineError}
        />
      </section>

      {showTranscription ? (
        <TranscriptionSection
          session={session}
          onCopy={handleCopyTranscription}
          copyHint={copyHint}
        />
      ) : null}
    </div>
  );
}

function SummaryBody({
  session,
  awaitingPipeline,
  needRegenerate,
  canReprocessAfterPipelineError,
}: {
  session: ApiSessionDetail;
  awaitingPipeline: boolean;
  needRegenerate: boolean;
  canReprocessAfterPipelineError: boolean;
}) {
  if (session.status === 'REPROCESSING') {
    return (
      <div className="notice notice--info">
        <p className="notice__title">{COPY.summaryReprocessingTitle}</p>
        <p className="muted notice__text">{COPY.summaryReprocessingSubtitle}</p>
      </div>
    );
  }

  if (needRegenerate) {
    return (
      <div className="notice notice--warn">
        <p className="notice__title">{COPY.summaryStuckTitle}</p>
        <p className="muted notice__text">{COPY.summaryStuckSubtitle}</p>
      </div>
    );
  }

  if (canReprocessAfterPipelineError) {
    return (
      <div className="notice notice--error">
        <p className="notice__title">{COPY.summaryPipelineErrorTitle}</p>
        <p className="muted notice__text">{COPY.summaryPipelineErrorSubtitle}</p>
      </div>
    );
  }

  if (awaitingPipeline) {
    return (
      <div className="notice notice--info">
        <p className="notice__title">{COPY.summaryProcessingTitle}</p>
        <p className="muted notice__text">{COPY.summaryProcessingSubtitle}</p>
      </div>
    );
  }

  if (session.interpretation?.trim()) {
    return <pre className="interpretation">{session.interpretation}</pre>;
  }

  return <p className="muted">{COPY.summaryEmpty}</p>;
}

function TranscriptionSection({
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
            : 'Brak transkrypcji. Odśwież stronę za chwilę.'}
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
        {speakerStats.map((row) => (
          <li
            key={row.speakerKey}
            className={`speaker-chip speaker-chip--${row.order % 3}`}>
            <span className="speaker-chip__name">{COPY.speakerLabel(row.order)}</span>
            <span className="speaker-chip__meta">
              {formatSecondsAsClock(row.seconds)}
              {row.percent != null
                ? ` · ${Math.round(row.percent)}% sesji`
                : null}
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
