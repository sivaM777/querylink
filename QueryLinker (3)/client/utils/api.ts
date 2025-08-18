interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiError extends Error {
  status?: number;
  statusText?: string;
}

/**
 * Enhanced fetch wrapper with error handling, retries, and timeout
 */
export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const {
    timeout = 10000,
    retries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add timeout to the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If response is ok, return it
      if (response.ok) {
        return response;
      }

      // For non-ok responses, create an error with status info
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as ApiError;
      error.status = response.status;
      error.statusText = response.statusText;
      lastError = error;

      // Don't retry on client errors (4xx) except for specific cases
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw error;
      }

    } catch (error) {
      lastError = error as ApiError;
      
      // Don't retry on abort errors (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeout}ms`) as ApiError;
        timeoutError.status = 408;
        throw timeoutError;
      }

      // If this was the last attempt, throw the error
      if (attempt === retries) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error('Unknown error occurred');
}

/**
 * Wrapper for JSON API calls
 */
export async function apiCall<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  try {
    const response = await apiFetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call failed for ${url}:`, error);
    
    // Add more context to the error
    if (error instanceof Error) {
      const apiError = error as ApiError;
      console.error(`Status: ${apiError.status}, Message: ${apiError.message}`);
    }
    
    throw error;
  }
}

/**
 * Get authentication headers for API calls
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  const headers: Record<string, string> = {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.id) {
        headers['X-User-ID'] = user.id.toString();
      }
    } catch (error) {
      console.warn('Failed to parse user data from localStorage:', error);
    }
  }
  
  return headers;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV || window.location.hostname === 'localhost';
}

/**
 * Get the API base URL based on environment
 */
export function getApiBaseUrl(): string {
  if (isDevelopment()) {
    return '';
  }
  
  // In production, use the same origin
  return window.location.origin;
}

/**
 * Create a full API URL
 */
export function createApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}
