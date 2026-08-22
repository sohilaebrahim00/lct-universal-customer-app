import { apiBaseUrl, isDemoMode } from './env';
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
/** Request timeout. Without one a dead host hangs a screen on its loading state forever. */
const TIMEOUT_MS = 12_000;

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  /*
   * DEMO MODE — the single interception point.
   *
   * Routing here rather than through src/api/* means every API module, store
   * and screen keeps its exact shape and knows nothing about the substitution.
   * It also means there is exactly one place to check that a demo build cannot
   * reach the network: this one.
   *
   * The require is lazy so the seeded dataset is only touched when demo mode
   * is on. Metro still resolves it statically — it collects requires regardless
   * of reachability — so the module is in the graph either way; what the lazy
   * form buys is that it is never EXECUTED in a normal build.
   */
  if (isDemoMode) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
    const { handleDemoRequest } = require('../dev/demoApi') as typeof import('../dev/demoApi');
    const result = await handleDemoRequest(path, method, body);
    if (result.handled) return result.data as T;
    // Unmapped endpoints surface as a normal error state rather than as a
    // silently empty screen.
    throw new ApiError(501, `Not available in this demo build (${method} ${path})`);
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (auth) Object.assign(headers, await getAuthHeader());

  // AbortController rather than Promise.race, so a timed-out request is
  // actually cancelled instead of left running behind a rejected promise.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (cause) {
    clearTimeout(timeout);
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    throw new ApiError(aborted ? 408 : 0, aborted ? 'The request timed out.' : 'Could not reach the server.');
  }
  clearTimeout(timeout);

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
