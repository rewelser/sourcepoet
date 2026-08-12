import type { AstroIntegration } from "astro";
import type { CmsConfig } from "@sveltia/cms";

const VIRTUAL_CONFIG_ID =
    "virtual:sourcepoet-sveltia/config";

const RESOLVED_VIRTUAL_CONFIG_ID =
    `\0${VIRTUAL_CONFIG_ID}`;

export interface SveltiaIntegrationOptions {
    config: CmsConfig;
    title?: string;
}

export function sveltiaIntegration(
    options: SveltiaIntegrationOptions,
): AstroIntegration {
    const config: CmsConfig = {
        ...options.config,
        load_config_file: false,
    };

    const title =
        options.title ?? "Sveltia CMS";

    return {
        name: "sourcepoet-sveltia",

        hooks: {
            "astro:config:setup": ({
                                       injectRoute,
                                       updateConfig,
                                   }) => {
                injectRoute({
                    pattern: "/admin",
                    entrypoint: new URL(
                        "./admin.astro",
                        import.meta.url,
                    ),
                    prerender: true,
                });

                injectRoute({
                    pattern: "/oauth",
                    entrypoint: new URL(
                        "./oauth/login.ts",
                        import.meta.url,
                    ),
                    prerender: false,
                });

                injectRoute({
                    pattern: "/oauth/callback",
                    entrypoint: new URL(
                        "./oauth/callback.ts",
                        import.meta.url,
                    ),
                    prerender: false,
                });

                updateConfig({
                    vite: {
                        plugins: [
                            {
                                name:
                                    "sourcepoet-sveltia-config",

                                resolveId(id) {
                                    if (
                                        id ===
                                        VIRTUAL_CONFIG_ID
                                    ) {
                                        return RESOLVED_VIRTUAL_CONFIG_ID;
                                    }
                                },

                                load(id) {
                                    if (
                                        id !==
                                        RESOLVED_VIRTUAL_CONFIG_ID
                                    ) {
                                        return;
                                    }

                                    return `
                                        export const config =
                                            ${JSON.stringify(config)};

                                        export const title =
                                            ${JSON.stringify(title)};
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