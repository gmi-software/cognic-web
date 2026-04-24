import type { ApiSessionDetail } from './api';

const ERROR_STATUSES = new Set([
  'ERROR',
  'FFMPEG_SERVICE_ERROR',
  'INTERPRETATION_ERROR',
  'TRANSCRIPTION_ERROR',
  'TRANSCRIPTION_TOO_SHORT_ERROR',
  'READ_FILE_ERROR',
]);

/** Zgodnie z aplikacją mobilną (`TIME_TO_REGENERATE`). */
export const SESSION_STUCK_AFTER_MS = 5 * 60 * 1000;

export function isErrorLikeSessionStatus(status: string): boolean {
  return ERROR_STATUSES.has(status);
}

export function shouldRegenerateSessionWeb(
  session: ApiSessionDetail | null | undefined,
): boolean {
  if (!session) return false;
  if (!session.updatedAt || Number.isNaN(new Date(session.updatedAt).getTime())) {
    return false;
  }

  const interpretationEmpty =
    session.interpretation === null ||
    session.interpretation === undefined ||
    session.interpretation === '';

  const textEmpty =
    session.text === null || session.text === undefined || session.text === '';

  const isTranscriptionEmpty = textEmpty && interpretationEmpty;

  const isTimeToRegenerate =
    new Date(session.updatedAt).getTime() < Date.now() - SESSION_STUCK_AFTER_MS;

  const isNew = session.status === 'NEW';

  return isTranscriptionEmpty && isTimeToRegenerate && isNew;
}

export function isAwaitingFirstPipelineSummary(
  session: ApiSessionDetail,
): boolean {
  return (
    !session.interpretation?.trim() &&
    (session.status === 'NEW' || session.status === 'PROCESSED')
  );
}
