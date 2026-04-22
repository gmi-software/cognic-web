const baseUrl = () => import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type ApiPatient = {
  id: string;
  name?: string | null;
};

export type ApiSessionListItem = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  duration?: number | null;
  patient?: ApiPatient | null;
  saveRecording?: boolean;
};

export type SessionAnalysisThread = { label: string; percent: number };
export type SessionAnalysisSoap = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};
export type SessionAnalysis = {
  threads: SessionAnalysisThread[];
  nextSessionSuggestion: string;
  soap: SessionAnalysisSoap;
};

export type ApiSessionDetail = ApiSessionListItem & {
  text?: string | null;
  interpretation?: string | null;
  analysis?: SessionAnalysis | null;
  summaryLanguage?: string;
};

export async function fetchSessions(token: string) {
  return apiGet<ApiSessionListItem[]>('/v1/session', token);
}

export async function fetchSession(id: string, token: string) {
  return apiGet<ApiSessionDetail>(`/v1/session/${id}`, token);
}
