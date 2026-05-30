/**
 * Enhanced fetch function that relies on the secure HttpOnly session cookie.
 * The legacy localStorage token cleanup remains for users upgrading from older builds.
 */
export function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  }).then((response) => {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authLastActivityAt');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return response;
  });
}

/**
 * Fetcher function for SWR that includes authentication
 */
export function authenticatedFetcher(url: string): Promise<any> {
  return fetchWithAuth(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    });
}
