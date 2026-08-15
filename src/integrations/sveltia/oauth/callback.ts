import type {APIRoute} from "astro";
import {getSecret} from "astro:env/server";
import {githubOAuth} from "virtual:sourcepoet-sveltia/config";

export const prerender = false;

interface GitHubTokenResponse {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
    error_uri?: string;
}

export const GET: APIRoute = async ({url, cookies}) => {
    const clientId = getSecret(githubOAuth.clientIdEnv);
    const clientSecret = getSecret(githubOAuth.clientSecretEnv);

    if (!clientId || !clientSecret) {
        return new Response(
            "Missing GitHub OAuth credentials.",
            {status: 500},
        );
    }

    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const expectedState = cookies.get("sveltia_oauth_state")?.value;
    const codeVerifier = cookies.get("sveltia_oauth_pkce")?.value;

    if (!code) {
        return new Response(
            "Missing GitHub OAuth authorization code.",
            {status: 400},
        );
    }

    if (
        !returnedState ||
        !expectedState ||
        returnedState !== expectedState
    ) {
        return new Response(
            "Invalid GitHub OAuth state.",
            {status: 400},
        );
    }

    if (!codeVerifier) {
        return new Response(
            "Missing OAuth PKCE verifier.",
            {status: 400},
        );
    }

    cookies.delete("sveltia_oauth_state", {path: "/"});
    cookies.delete("sveltia_oauth_pkce", {path: "/"});

    const callbackUrl = new URL(
        githubOAuth.callbackPath,
        url.origin,
    );

    let response: Response;

    try {
        response = await fetch(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",

                headers: {
                    Accept: "application/json",
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },

                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    redirect_uri: callbackUrl.toString(),
                    code_verifier: `${codeVerifier}wrong`,
                }),
            },
        );
    } catch (error) {
        console.error(
            "[sveltia-oauth] GitHub token request failed:",
            error,
        );

        return new Response(
            "Unable to contact GitHub OAuth.",
            {status: 502},
        );
    }

    const body = await response.json() as GitHubTokenResponse;

    if (!response.ok) {
        console.error(
            "[sveltia-oauth] GitHub rejected token exchange:",
            {
                status: response.status,
                error: body.error,
                errorDescription:
                body.error_description,
                errorUri:
                body.error_uri,
            },
        );

        const isOAuthRejection =
            response.status === 400;

        return new Response(
            isOAuthRejection
                ? "GitHub OAuth authorization failed."
                : "GitHub OAuth token request failed.",
            {
                status:
                    isOAuthRejection
                        ? 400
                        : 502,
            },
        );
    }

    if (body.error) {
        console.error(
            "[sveltia-oauth] GitHub OAuth error:",
            {
                error:
                body.error,

                errorDescription:
                body.error_description,

                errorUri:
                body.error_uri,
            },
        );

        return new Response(
            "GitHub OAuth authorization failed.",
            {status: 400},
        );
    }

    if (!body.access_token) {
        console.error(
            "[sveltia-oauth] GitHub token response did not contain an access token.",
            {status: response.status},
        );

        return new Response(
            "GitHub did not return an access token.",
            {status: 502},
        );
    }

    const content = {
        token: body.access_token,
        provider: "github",
    };

    const authorizationMessage = `authorization:github:success:${JSON.stringify(content)}`;

    const origin = url.origin;

    const html = `
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>GitHub authorization</title>
            </head>

            <body>
                <script>
                    const opener = window.opener;
                    const origin = ${JSON.stringify(origin)};
                    const authorizationMessage =
                        ${JSON.stringify(authorizationMessage)};

                    if (!opener) {
                        document.body.textContent =
                            "Unable to return authorization to the CMS.";
                    } else {
                        const receiveMessage = (event) => {
                            if (
                                event.origin !== origin ||
                                event.source !== opener
                            ) {
                                return;
                            }

                            opener.postMessage(
                                authorizationMessage,
                                origin,
                            );

                            window.removeEventListener(
                                "message",
                                receiveMessage,
                            );

                            window.close();
                        };

                        window.addEventListener(
                            "message",
                            receiveMessage,
                        );

                        opener.postMessage(
                            "authorizing:github",
                            origin,
                        );
                    }
                </script>
            </body>
        </html>
    `;

    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
};