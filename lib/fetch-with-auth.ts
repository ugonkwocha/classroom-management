/**
 * Enhanced fetch function that automatically includes JWT token from localStorage
 * Ensures all API calls are properly authenticated
 */
export function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
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
