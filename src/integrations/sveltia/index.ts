import type {AstroIntegration} from "astro";
import type {CmsConfig} from "@sveltia/cms";
import {readFileSync, writeFileSync} from "node:fs";
import {relative, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {parse} from "yaml";

const VIRTUAL_CONFIG_ID = "virtual:sourcepoet-sveltia/config";
const RESOLVED_VIRTUAL_CONFIG_ID = `\0${VIRTUAL_CONFIG_ID}`;
const VIRTUAL_IMAGES_ID = "virtual:sourcepoet-sveltia/images";
const RESOLVED_VIRTUAL_IMAGES_ID = `\0${VIRTUAL_IMAGES_ID}`;

type SveltiaConfigSource =
    | {
    config: CmsConfig;
    configPath?: never;
}
    | {
    config?: never;
    configPath: string;
};

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

export type SveltiaIntegrationOptions =
    SveltiaConfigSource & {
    title?: string;

    githubOAuth?:
        | false
        | GitHubOAuthOptions;
};

function normalizeRoutePath(
    path: string,
): string {
    return path.startsWith("/")
        ? path
        : `/${path}`;
}

function resolveGitHubOAuth(
    config: CmsConfig,
    option:
        | false
        | GitHubOAuthOptions
        | undefined,
): ResolvedGitHubOAuthOptions {
    const backend =
        config.backend as
            | Record<string, unknown>
            | undefined;

    const isGitHub = backend?.name === "github";

    const hasExplicitBaseUrl = typeof backend?.base_url === "string";

    let enabled: boolean;

    if (option === false) {
        enabled = false;
    } else if (option !== undefined) {
        enabled = true;
    } else {
        enabled =
            isGitHub &&
            !hasExplicitBaseUrl;
    }

    const options =
        option && typeof option === "object" ? option : {};

    const authPath = normalizeRoutePath(options.authPath ?? "/auth");

    const callbackPath = normalizeRoutePath(options.callbackPath ?? "/callback");

    return {
        enabled,

        clientIdEnv:
            options.clientIdEnv ??
            "GITHUB_OAUTH_CLIENT_ID",

        clientSecretEnv:
            options.clientSecretEnv ??
            "GITHUB_OAUTH_CLIENT_SECRET",

        authPath,
        callbackPath,

        authEndpoint:
            authPath.replace(
                /^\/+/,
                "",
            ),

        scopes:
            options.scopes ??
            [
                "repo",
                "user",
            ],
    };
}

function loadCmsConfig(options: SveltiaIntegrationOptions, root: URL): CmsConfig {
    let config: CmsConfig;

    if (options.config !== undefined) {
        config = options.config;
    } else {
        const configPath = resolve(fileURLToPath(root), options.configPath);

        let source: string;

        try {
            source = readFileSync(configPath, "utf-8");
        } catch {
            throw new Error(
                `[sourcepoet-sveltia] Could not read ` +
                `CMS config from "${configPath}".`,
            );
        }

        let parsed: unknown;

        try {
            parsed = parse(source);
        } catch (error) {
            throw new Error(
                `[sourcepoet-sveltia] Could not parse ` +
                `CMS config at "${configPath}".`,
                {cause: error},
            );
        }

        if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            throw new Error(
                `[sourcepoet-sveltia] CMS config at ` +
                `"${configPath}" must contain a YAML object.`,
            );
        }

        config = parsed as CmsConfig;
    }

    return {
        ...config,

        // We always hand Sveltia the resolved config
        // object ourselves.
        load_config_file: false,
    };
}

export function sveltiaIntegration(options: SveltiaIntegrationOptions): AstroIntegration {

    const title = options.title ?? "Sveltia CMS";

    return {
        name: "sourcepoet-sveltia",

        hooks: {
            "astro:config:setup": ({
                                       config: astroConfig,
                                       injectRoute,
                                       updateConfig,
                                       createCodegenDir,
                                   }) => {

                const rootPath = fileURLToPath(astroConfig.root);
                const srcPath = fileURLToPath(astroConfig.srcDir);
                const srcRelative = relative(rootPath, srcPath).replaceAll("\\", "/");
                const imageGlob = `/${srcRelative}/**/*.{jpeg,jpg,png,tiff,webp,gif,avif}`;

                const cmsConfig = loadCmsConfig(options, astroConfig.root);
                const githubOAuth = resolveGitHubOAuth(cmsConfig, options.githubOAuth);
                const codegenDir = createCodegenDir();

                writeFileSync(
                    new URL("config.json", codegenDir),
                    JSON.stringify(cmsConfig),
                    "utf-8",
                );

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
                                name: "sourcepoet-sveltia-config",

                                resolveId(id) {
                                    if (id === VIRTUAL_CONFIG_ID) {
                                        return RESOLVED_VIRTUAL_CONFIG_ID;
                                    }
                                },

                                load(id) {
                                    if (id !== RESOLVED_VIRTUAL_CONFIG_ID) {
                                        return;
                                    }

                                    return `
                                        export const config = ${JSON.stringify(cmsConfig)};
                                        export const title = ${JSON.stringify(title)};
                                        export const githubOAuth = ${JSON.stringify(githubOAuth)};
                                    `;
                                },
                            },
                            {
                                name: "sourcepoet-sveltia-images",

                                resolveId(id) {
                                    if (id === VIRTUAL_IMAGES_ID) {
                                        return (RESOLVED_VIRTUAL_IMAGES_ID);
                                    }
                                },

                                load(id) {
                                    if (id !== RESOLVED_VIRTUAL_IMAGES_ID) {
                                        return;
                                    }

                                    return `
                                        const images = import.meta.glob(${JSON.stringify(imageGlob)});
                
                                        export async function resolveSveltiaImage(path) {
                                            const importer = images[path];
                
                                            if (!importer) {
                                                throw new Error(
                                                    '[sveltiaLoader] Image "' +
                                                    path +
                                                    '" was not found in the Astro image glob.'
                                                );
                                            }
                
                                            return importer();
                                        }
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