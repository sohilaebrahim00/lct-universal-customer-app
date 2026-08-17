import { apiBaseUrl } from './env';
import { supabase } from './supabase';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

/**
 * Thin fetch wrapper matching lct-universal-backend's response conventions:
 * JSON bodies, `{ error, details }` on failure. Every authenticated call
 * reads the current Supabase session fresh (supabase-js keeps it refreshed
 * in the background), so there's no separate token-caching layer to get
 * stale.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (auth) Object.assign(headers, await getAuthHeader());

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = (data && typeof data === 'object' && 'error' in data ? String(data.error) : null) ?? response.statusText;
    throw new ApiError(response.status, message, data && typeof data === 'object' ? (data as { details?: unknown }).details : undefined);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) => apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) => apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
