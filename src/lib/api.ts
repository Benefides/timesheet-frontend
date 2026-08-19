import axios, { type InternalAxiosRequestConfig } from 'axios';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
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
    // Fall back to any cached account: a request can race ahead of the provider
    // that sets the active one, and sending no header at all reads to the API
    // as an anonymous call ("Missing bearer token").
    const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
    if (account) {
      if (!msalInstance.getActiveAccount()) msalInstance.setActiveAccount(account);
      try {
        const result = await msalInstance.acquireTokenSilent({ scopes: [apiScope], account });
        cfg.headers.set('Authorization', `Bearer ${result.accessToken}`);
      } catch (err) {
        // Only a genuine consent/expiry problem warrants bouncing the user to
        // Microsoft; redirecting on any error risks an endless redirect loop.
        if (err instanceof InteractionRequiredAuthError) {
          await msalInstance.acquireTokenRedirect({ scopes: [apiScope], account });
        }
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
