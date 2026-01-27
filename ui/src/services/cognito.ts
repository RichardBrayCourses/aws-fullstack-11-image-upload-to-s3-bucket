/**
 * The API below uses browser "session storage".
 * The effect is that the user is logged out as soon as the browser tab or window is closed.
 *
 * An alternative is browser "localStorage".
 * This persists across browser sessions, meaning that the user remains logged in
 * when the browser is closed and re-opened, until the Cognito token expires.
 *
 * If you would prefer this then you should create a localStorage.ts file:
 * - copy sessionStorage.ts,
 * - replace all instances of window.sessionStorage with window.localStorage
 * - Replace imports: change "./sessionStorage" to "./localStorage"
 */

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  decodeIdToken,
  getCognitoLoginUrl,
  getCognitoLogoutUrl,
} from "../utils/oauth-helpers";
import { sessionStorage } from "../utils/sessionStorage";
import type { OAuthUser } from "../types";
import api from "./apiServer";

export async function startLogin(): Promise<void> {
  const config = await api.getConfig();

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setCodeVerifier(codeVerifier);
  sessionStorage.setState(state);

  window.location.href = getCognitoLoginUrl(
    state,
    codeChallenge,
    config.cognitoDomain,
    config.cognitoClientId,
  );
}

export async function handleOAuthCallback(
  code: string,
  state: string,
): Promise<OAuthUser> {
  const config = await api.getConfig();
  const storedState = sessionStorage.getState();
  const codeVerifier = sessionStorage.getCodeVerifier();

  if (!storedState || !codeVerifier) {
    throw new Error(
      "Error: unable to read state or code verifier from session storage.",
    );
  }

  if (state !== storedState) {
    throw new Error("Error: cognito/session-storage state mismatch");
  }

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.cognitoClientId,
    code: code,
    redirect_uri: `${window.location.origin}/callback`,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${config.cognitoDomain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const tokens = await response.json();
  sessionStorage.removeCodeVerifier();
  sessionStorage.removeState();

  if (!tokens.access_token) {
    throw new Error("No access token received");
  }

  sessionStorage.setAccessToken(tokens.access_token);

  if (!tokens.id_token) {
    throw new Error("No ID token received");
  }

  sessionStorage.setIdToken(tokens.id_token);

  const user = decodeIdToken(tokens.id_token);
  if (!user) {
    throw new Error("Failed to decode user information from ID token");
  }

  return user;
}

export async function doLogout(): Promise<void> {
  const config = await api.getConfig();
  sessionStorage.clearAll();
  window.location.href = getCognitoLogoutUrl(
    config.cognitoDomain,
    config.cognitoClientId,
  );
}

export function getUserFromStoredToken(): OAuthUser | null {
  const idToken = sessionStorage.getIdToken();
  if (!idToken) return null;
  return decodeIdToken(idToken);
}
