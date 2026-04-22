const LABELS: Record<string, string> = {
  NEW: 'Nowa',
  PROCESSED: 'Przetwarzanie',
  READY: 'Gotowa',
  READ_FILE_ERROR: 'Błąd odczytu pliku',
  FFMPEG_SERVICE_ERROR: 'Błąd konwersji audio',
  TRANSCRIPTION_ERROR: 'Błąd transkrypcji',
  TRANSCRIPTION_TOO_SHORT_ERROR: 'Transkrypcja zbyt krótka',
  INTERPRETATION_ERROR: 'Błąd interpretacji',
  ERROR: 'Błąd',
  REPROCESSING: 'Ponowne przetwarzanie',
};

export function sessionStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}
