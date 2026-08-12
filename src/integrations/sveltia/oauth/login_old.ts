import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
    const clientId = import.meta.env.GITHUB_OAUTH_CLIENT_ID;

    if (!clientId) {
        return new Response("Missing GitHub OAuth client ID.", {
            status: 500,
        });
    }

    const state = crypto.randomUUID();

    cookies.set("sveltia_oauth_state", state, {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10,
    });

    const callbackUrl =
        new URL("/oauth/callback", url.origin).toString();

    const authorizeUrl =
        new URL("https://github.com/login/oauth/authorize");

    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("scope", "repo,user");

    return redirect(authorizeUrl.toString());
};