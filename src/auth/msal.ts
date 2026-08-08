import { PublicClientApplication } from '@azure/msal-browser';
import { authMode, msalConfig } from '../authConfig';

// Only instantiated in entra mode — dev mode needs no Azure config at all.
export const msalInstance =
  authMode === 'entra' ? new PublicClientApplication(msalConfig) : null;

export async function initAuth(): Promise<void> {
  if (msalInstance) {
    await msalInstance.initialize();
    await msalInstance.handleRedirectPromise();
  }
}
