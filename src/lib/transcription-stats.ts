import type { TranscriptionTurn } from './api';

export type { TranscriptionTurn } from './api';

export function formatSecondsAsClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function formatTimeRange(startSec: number, endSec: number): string {
  return `${formatSecondsAsClock(startSec)}–${formatSecondsAsClock(endSec)}`;
}

function turnDurationSec(t: TranscriptionTurn): number {
  return Math.max(0, (t.endSec ?? 0) - (t.startSec ?? 0));
}

export type SpeakerStatRow = {
  speakerKey: string;
  order: number;
  seconds: number;
  percent: number | null;
};

export function buildSpeakerOrder(turns: TranscriptionTurn[]): Map<string, number> {
  const map = new Map<string, number>();
  let next = 0;
  for (const t of turns) {
    if (!map.has(t.speaker)) {
      map.set(t.speaker, next);
      next += 1;
    }
  }
  return map;
}

export function computeSpeakerStats(
  turns: TranscriptionTurn[],
  sessionDurationMs: number,
): SpeakerStatRow[] {
  const orderMap = buildSpeakerOrder(turns);
  const secondsBySpeaker = new Map<string, number>();

  for (const t of turns) {
    const d = turnDurationSec(t);
    secondsBySpeaker.set(t.speaker, (secondsBySpeaker.get(t.speaker) ?? 0) + d);
  }

  const sessionSec = sessionDurationMs > 0 ? sessionDurationMs / 1000 : 0;
  const totalTurnSec = Array.from(secondsBySpeaker.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const denom = sessionSec > 0 ? sessionSec : totalTurnSec;

  return Array.from(secondsBySpeaker.entries())
    .map(([speakerKey, seconds]) => ({
      speakerKey,
      order: orderMap.get(speakerKey) ?? 0,
      seconds,
      percent:
        denom > 0 ? Math.min(100, (seconds / denom) * 100) : null,
    }))
    .sort((a, b) => a.order - b.order);
}

export function buildTranscriptionClipboardText(
  turns: TranscriptionTurn[] | null | undefined,
  plainText: string,
  speakerLabelForOrder: (order: number) => string,
): string {
  if (!turns?.length) {
    return plainText;
  }
  const orderMap = buildSpeakerOrder(turns);
  return turns
    .map((t) => {
      const ord = orderMap.get(t.speaker) ?? 0;
      const label = speakerLabelForOrder(ord);
      const range = formatTimeRange(t.startSec, t.endSec);
      return `${label} (${range})\n${t.text}`;
    })
    .join('\n\n');
}
