import type {APIRoute} from "astro";
import {getSecret} from "astro:env/server";
import {githubOAuth} from "virtual:sourcepoetry-astro-sveltia/config";

export const prerender = false;

const cookieOptions = {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
};

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function createCodeVerifier(): string {
    return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

async function createCodeChallenge(verifier: string): Promise<string> {
    const bytes = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", bytes);

    return base64UrlEncode(new Uint8Array(digest));
}

export const GET: APIRoute = async ({cookies, redirect, url}) => {
    const clientId = getSecret(githubOAuth.clientIdEnv);

    if (!clientId) {
        return new Response(
            `Missing GitHub OAuth client ID environment variable "${githubOAuth.clientIdEnv}".`,
            {status: 500},
        );
    }

    const state = crypto.randomUUID();
    const codeVerifier = createCodeVerifier();
    const codeChallenge = await createCodeChallenge(codeVerifier);

    cookies.set("sveltia_oauth_state", state, cookieOptions);
    cookies.set("sveltia_oauth_pkce", codeVerifier, cookieOptions);

    const callbackUrl = new URL(githubOAuth.callbackPath, url.origin);
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");

    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", callbackUrl.toString());
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("scope", githubOAuth.scopes.join(" "));
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    return redirect(authorizeUrl.toString());
};