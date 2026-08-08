import type { Configuration, RedirectRequest } from '@azure/msal-browser';

export const authMode = (import.meta.env.VITE_AUTH_MODE ?? 'dev') as 'dev' | 'entra';
export const apiBase = (import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api/v1') as string;

const clientId = (import.meta.env.VITE_ENTRA_CLIENT_ID ?? '') as string;
const tenantId = (import.meta.env.VITE_ENTRA_TENANT_ID ?? '') as string;
export const apiScope = (import.meta.env.VITE_ENTRA_API_SCOPE ?? '') as string;

// MSAL config for the real Entra sign-in path.
export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'sessionStorage' }, // tokens in session, not local storage
};

export const loginRequest: RedirectRequest = { scopes: [apiScope] };

// Seeded users for the dev login (must match prisma/seed.ts).
export const devUsers = [
  { email: 'admin@example.com', label: 'Ava Admin (Administrator)' },
  { email: 'manager@example.com', label: 'Mo Manager (Manager)' },
  { email: 'employee@example.com', label: 'Evan Employee (Employee)' },
];
