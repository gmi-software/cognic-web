import type { ApiSessionDetail } from './api';

const baseUrl = () => import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export type AdminSessionListItem = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  duration?: number | null;
  patient?: { id: string; name?: string | null } | null;
};

export type AdminCreditPackage = {
  id: string;
  userId: string;
  quantity: number;
  expireAt: string;
  webOrderLineItemId: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminAnalyticsSummary = {
  from: string;
  to: string;
  byStatus: { status: string; count: number }[];
  byDay: { day: string; count: number }[];
  topUserIds?: { userId: string; count: number }[];
};

export type AdminSessionDiagnostics = {
  sessionId: string;
  status: string;
  hasStoredAnalysis: boolean;
  transcriptionTurnsCount: number;
  hasTranscriptionText: boolean;
  transcriptionTextLength: number;
  interpretationLength: number;
  interpretationDiagnostics: {
    jsonParseOk: boolean;
    schemaOk: boolean;
    zodIssuePaths: string[];
    rawLength: number;
    usedExtractedCandidate: boolean;
  };
  interpretationParsesAsStructuredAnalysis: boolean;
  openaiInterpretationModel: string | null;
  openaiTranscriptionModel: string | null;
  interpretationChatUsesOpenRouter: boolean;
};

async function adminRequest<T>(
  path: string,
  getAccessToken: () => Promise<string>,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const token = await getAccessToken();
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const method = init?.method ?? 'GET';
  const hasBody = init?.body !== undefined;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export function fetchAdminUserSessions(
  userId: string,
  getAccessToken: () => Promise<string>,
  params?: { limit?: number; offset?: number },
) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return adminRequest<AdminSessionListItem[]>(
    `/v1/admin/users/${encodeURIComponent(userId)}/sessions${qs ? `?${qs}` : ''}`,
    getAccessToken,
  );
}

export function fetchAdminUserSessionDetail(
  userId: string,
  sessionId: string,
  getAccessToken: () => Promise<string>,
) {
  return adminRequest<ApiSessionDetail>(
    `/v1/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`,
    getAccessToken,
  );
}

export function fetchAdminUserCredits(
  userId: string,
  getAccessToken: () => Promise<string>,
) {
  return adminRequest<{
    packages: AdminCreditPackage[];
    activeSum: number;
    hasPaidSessions: boolean;
  }>(`/v1/admin/users/${encodeURIComponent(userId)}/credits`, getAccessToken);
}

export function postAdminGrantCredits(
  userId: string,
  body: { quantity: number; expiresInDays?: number },
  getAccessToken: () => Promise<string>,
) {
  return adminRequest<{ ok: boolean; expireAt: string }>(
    `/v1/admin/users/${encodeURIComponent(userId)}/credits`,
    getAccessToken,
    { method: 'POST', body },
  );
}

export function fetchAdminAnalyticsSummary(
  fromIso: string,
  toIso: string,
  getAccessToken: () => Promise<string>,
  includeTopUserIds?: boolean,
) {
  const q = new URLSearchParams({ from: fromIso, to: toIso });
  if (includeTopUserIds) q.set('includeTopUserIds', 'true');
  return adminRequest<AdminAnalyticsSummary>(
    `/v1/admin/analytics/summary?${q.toString()}`,
    getAccessToken,
  );
}

export function fetchAdminSessionDiagnostics(
  userId: string,
  sessionId: string,
  getAccessToken: () => Promise<string>,
) {
  return adminRequest<AdminSessionDiagnostics>(
    `/v1/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}/diagnostics`,
    getAccessToken,
  );
}

export function postAdminReprocessSession(
  userId: string,
  sessionId: string,
  getAccessToken: () => Promise<string>,
) {
  return adminRequest<{ status: string }>(
    `/v1/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}/reprocess`,
    getAccessToken,
    { method: 'POST' },
  );
}
