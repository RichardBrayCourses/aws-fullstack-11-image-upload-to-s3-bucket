import { OAuthUser } from "@/types";

export function getCognitoLoginUrl(
  state: string,
  codeChallenge: string,
  domain: string,
  client_id: string,
): string {
  const authUrl = new URL(`${domain}/oauth2/authorize`);
  authUrl.searchParams.set("client_id", client_id);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email");
  authUrl.searchParams.set(
    "redirect_uri",
    `${window.location.origin}/callback`,
  );
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  // Force login prompt even if Cognito has an existing session cookie
  // This ensures users must re-authenticate when starting a new session
  authUrl.searchParams.set("prompt", "login");
  return authUrl.toString();
}

export function getCognitoLogoutUrl(domain: string, client_id: string) {
  return `${domain}/logout?client_id=${client_id}&logout_uri=${encodeURIComponent(
    window.location.origin,
  )}`;
}

/**
 * Generate a random string for PKCE code verifier
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier using SHA256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function decodeIdToken(idToken: string): OAuthUser | null {
  try {
    const payload = idToken.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return {
      sub: decoded.sub,
      email: decoded.email,
      groups: decoded["cognito:groups"] || [],
      email_verified: decoded.email_verified,
    };
  } catch {
    return null;
  }
}
