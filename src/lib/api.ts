import axios, { type InternalAxiosRequestConfig } from 'axios';
import { apiBase, apiScope, authMode } from '../authConfig';
import { msalInstance } from '../auth/msal';

const DEV_KEY = 'ts.devEmail';

export const api = axios.create({ baseURL: apiBase });

/**
 * Every request gets an auth header. In dev mode that's the x-dev-email header;
 * in entra mode it's a Bearer token acquired silently from MSAL (falling back
 * to an interactive redirect if the cached token can't be renewed).
 */
api.interceptors.request.use(async (cfg: InternalAxiosRequestConfig) => {
  if (authMode === 'dev') {
    const email = localStorage.getItem(DEV_KEY);
    if (email) cfg.headers.set('x-dev-email', email);
    return cfg;
  }

  if (msalInstance) {
    const account = msalInstance.getActiveAccount();
    if (account) {
      try {
        const result = await msalInstance.acquireTokenSilent({ scopes: [apiScope], account });
        cfg.headers.set('Authorization', `Bearer ${result.accessToken}`);
      } catch {
        await msalInstance.acquireTokenRedirect({ scopes: [apiScope], account });
      }
    }
  }
  return cfg;
});

// Surface a clean message from the backend's { error: { message } } shape.
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message ?? err.message;
  }
  return 'Something went wrong';
}
