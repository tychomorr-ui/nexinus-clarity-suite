import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const PRIVATE_OAUTH_KEY = "xinus-private-oauth";

function randomUrlValue(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** Starts the XinUS-owned first-party OAuth authorization-code flow with PKCE. */
export const startLogin = async () => {
  try {
    const state = randomUrlValue();
    const verifier = randomUrlValue(48);
    const redirectUri = `${window.location.origin}/private-oauth/callback`;
    sessionStorage.setItem(PRIVATE_OAUTH_KEY, JSON.stringify({ state, verifier, redirectUri }));
    const url = new URL("/api/private-oauth/authorize", window.location.origin);
    url.searchParams.set("client_id", "xinus-private-web");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", await pkceChallenge(verifier));
    url.searchParams.set("state", state);
    window.location.assign(url.toString());
  } catch {
    window.location.assign("/private-sign-in?auth=retry");
  }
};

export function consumePrivateOAuthAttempt() {
  const stored = sessionStorage.getItem(PRIVATE_OAUTH_KEY);
  sessionStorage.removeItem(PRIVATE_OAUTH_KEY);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored);
    return typeof value.state === "string" && typeof value.verifier === "string" && typeof value.redirectUri === "string" ? value : null;
  } catch {
    return null;
  }
}
