type RegistrationSearchParams = {
  email?: string | null;
  phone?: string | null;
  submissionId?: string | null;
  formId?: string | null;
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

export async function searchExternalRegistrations(params: RegistrationSearchParams) {
  const endpoint = getSearchEndpoint();
  if (!endpoint) {
    throw new Error('WordPress registration search endpoint is not configured');
  }

  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const username = process.env.WORDPRESS_API_USER;
  const password = process.env.WORDPRESS_API_PASSWORD;
  const headers: Record<string, string> = {};

  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  const response = await fetch(url, { headers, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `WordPress registration search failed with ${response.status}`);
  }

  if (Array.isArray(data)) return data as ExternalRegistrationResult[];
  if (Array.isArray(data.results)) return data.results as ExternalRegistrationResult[];
  return [];
}
