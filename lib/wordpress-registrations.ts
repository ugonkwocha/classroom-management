type RegistrationSearchParams = {
  email?: string | null;
  phone?: string | null;
  submissionId?: string | null;
  formId?: string | null;
  query?: string | null;
};

type FluentFormSubmissionCandidate = {
  id: string;
  formId: string;
};

export type ExternalRegistrationChild = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  dateOfBirth?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  priceType?: string | null;
  priceAmount?: number | null;
};

export type ExternalRegistrationResult = {
  sourceFormId: string;
  sourceSubmissionId: string;
  submittedAt?: string | null;
  parentFirstName: string;
  parentLastName: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  parentPhoneCountryCode?: string | null;
  expectedAmount?: number | null;
  children: ExternalRegistrationChild[];
  rawPayload?: unknown;
};

function getSearchEndpoint() {
  const explicitEndpoint = process.env.WORDPRESS_CONFIRMED_REGISTRATIONS_ENDPOINT;
  if (explicitEndpoint) return explicitEndpoint;

  const baseUrl = process.env.WORDPRESS_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) return null;

  return `${baseUrl}/wp-json/9ck/v1/confirmed-registrations/search`;
}

function getWordPressBaseUrl(searchEndpoint: string) {
  const configuredBaseUrl = process.env.WORDPRESS_BASE_URL?.replace(/\/$/, '');
  if (configuredBaseUrl) return configuredBaseUrl;

  const markerIndex = searchEndpoint.indexOf('/wp-json/');
  if (markerIndex !== -1) return searchEndpoint.slice(0, markerIndex);
  return new URL(searchEndpoint).origin;
}

function getAuthorizationHeaders() {
  const username = process.env.WORDPRESS_API_USER;
  const password = process.env.WORDPRESS_API_PASSWORD;
  const headers: Record<string, string> = {};

  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  return headers;
}

export function extractFluentFormSubmissionCandidates(data: unknown): FluentFormSubmissionCandidate[] {
  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const directRows = Array.isArray(payload.data) ? payload.data : null;
  const nestedPayload = payload.data && typeof payload.data === 'object'
    ? payload.data as Record<string, unknown>
    : null;
  const rows = directRows || (nestedPayload && Array.isArray(nestedPayload.data) ? nestedPayload.data : []);

  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const candidate = row as Record<string, unknown>;
    const id = String(candidate.id || '').trim();
    const formId = String(candidate.form_id || candidate.formId || '').trim();
    return id && formId ? [{ id, formId }] : [];
  });
}

async function searchFluentFormSubmissionCandidates(query: string, searchEndpoint: string) {
  const url = new URL(`${getWordPressBaseUrl(searchEndpoint)}/wp-json/fluentform/v1/submissions/all`);
  url.searchParams.set('search', query);
  url.searchParams.set('per_page', '20');
  url.searchParams.set('page', '1');

  const response = await fetch(url, {
    headers: getAuthorizationHeaders(),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' && data.message)
      || `WordPress history search failed with ${response.status}`
    );
  }

  return extractFluentFormSubmissionCandidates(data).slice(0, 20);
}

async function searchNormalizedEndpoint(
  endpoint: string,
  params: Omit<RegistrationSearchParams, 'query'>
) {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: getAuthorizationHeaders(),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `WordPress registration search failed with ${response.status}`);
  }

  if (Array.isArray(data)) return data as ExternalRegistrationResult[];
  if (Array.isArray(data.results)) return data.results as ExternalRegistrationResult[];
  return [];
}

export async function searchExternalRegistrations(params: RegistrationSearchParams) {
  const endpoint = getSearchEndpoint();
  if (!endpoint) {
    throw new Error('WordPress registration search endpoint is not configured');
  }

  if (!params.query) {
    return searchNormalizedEndpoint(endpoint, params);
  }

  const candidates = await searchFluentFormSubmissionCandidates(params.query, endpoint);
  const results: ExternalRegistrationResult[] = [];

  for (let index = 0; index < candidates.length; index += 5) {
    const batch = candidates.slice(index, index + 5);
    const batchResults = await Promise.allSettled(batch.map((candidate) => searchNormalizedEndpoint(endpoint, {
      submissionId: candidate.id,
      formId: candidate.formId,
    })));
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') results.push(...result.value);
    });

    if (results.length === 0 && batchResults.every((result) => result.status === 'rejected')) {
      const firstFailure = batchResults[0];
      throw firstFailure.status === 'rejected' && firstFailure.reason instanceof Error
        ? firstFailure.reason
        : new Error('WordPress registration details could not be loaded');
    }
  }

  const uniqueResults = new Map<string, ExternalRegistrationResult>();
  results.forEach((result) => {
    uniqueResults.set(`${result.sourceFormId}:${result.sourceSubmissionId}`, result);
  });
  return [...uniqueResults.values()];
}
