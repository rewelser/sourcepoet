import type {AstroIntegration} from "astro";
import type {CmsConfig} from "@sveltia/cms";
import {toSveltiaConfig} from "./internal/to-sveltia-config.ts";

const VIRTUAL_CONFIG_ID = "virtual:sourcepoetry-astro-sveltia/config";
const RESOLVED_VIRTUAL_CONFIG_ID = `\0${VIRTUAL_CONFIG_ID}`;

export interface GitHubOAuthOptions {
    clientIdEnv?: string;
    clientSecretEnv?: string;
    authPath?: string;
    callbackPath?: string;
    scopes?: string[];
}

interface ResolvedGitHubOAuthOptions {
    enabled: boolean;
    clientIdEnv: string;
    clientSecretEnv: string;
    authPath: string;
    callbackPath: string;
    authEndpoint: string;
    scopes: string[];
}

export interface SveltiaIntegrationOptions<Config extends CmsConfig = CmsConfig> {
    config: Config;
    title?: string;
    githubOAuth?: false | GitHubOAuthOptions;
}

function normalizeRoutePath(path: string): string {
    return path.startsWith("/") ? path : `/${path}`;
}

function resolveGitHubOAuth(
    config: CmsConfig,
    option: false | GitHubOAuthOptions | undefined,
): ResolvedGitHubOAuthOptions {
    const backend = config.backend as Record<string, unknown> | undefined;
    const isGitHub = backend?.name === "github";
    const hasExplicitBaseUrl = typeof backend?.base_url === "string";
    const enabled = option !== false && (option !== undefined || (isGitHub && !hasExplicitBaseUrl));
    const options = option && typeof option === "object" ? option : {};

    const authPath = normalizeRoutePath(options.authPath ?? "/auth");
    const callbackPath = normalizeRoutePath(options.callbackPath ?? "/callback");

    return {
        enabled,
        clientIdEnv: options.clientIdEnv ?? "GITHUB_OAUTH_CLIENT_ID",
        clientSecretEnv: options.clientSecretEnv ?? "GITHUB_OAUTH_CLIENT_SECRET",
        authPath,
        callbackPath,
        authEndpoint: authPath.replace(/^\/+/, ""),
        scopes: options.scopes ?? ["repo", "user"],
    };
}

export function sveltiaIntegration<const Config extends CmsConfig>(
    options: SveltiaIntegrationOptions<Config>,
): AstroIntegration {
    const title = options.title ?? "Sveltia CMS";
    const config = toSveltiaConfig(options.config);
    const githubOAuth = resolveGitHubOAuth(config, options.githubOAuth);

    return {
        name: "@sourcepoetry/astro-sveltia",

        hooks: {
            "astro:config:setup": ({injectRoute, updateConfig}) => {
                injectRoute({
                    pattern: "/admin",
                    entrypoint: new URL("./admin.astro", import.meta.url),
                    prerender: true,
                });

                if (githubOAuth.enabled) {
                    injectRoute({
                        pattern: githubOAuth.authPath,
                        entrypoint: new URL("./oauth/login.ts", import.meta.url),
                        prerender: false,
                    });

                    injectRoute({
                        pattern: githubOAuth.callbackPath,
                        entrypoint: new URL("./oauth/callback.ts", import.meta.url),
                        prerender: false,
                    });
                }

                updateConfig({
                    vite: {
                        plugins: [
                            {
                                name: "sourcepoetry-astro-sveltia-config",

                                resolveId(id) {
                                    if (id === VIRTUAL_CONFIG_ID) return RESOLVED_VIRTUAL_CONFIG_ID;
                                },

                                load(id) {
                                    if (id !== RESOLVED_VIRTUAL_CONFIG_ID) return;

                                    return `
                                        export const config = ${JSON.stringify(config)};
                                        export const title = ${JSON.stringify(title)};
                                        export const githubOAuth = ${JSON.stringify(githubOAuth)};
                                    `;
                                },
                            },
                        ],
                    },
                });
            },
        },
    };
}

export default sveltiaIntegration;

export {defineCmsConfig} from "./content/define-config.ts";