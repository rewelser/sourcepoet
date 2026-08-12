import type { AstroIntegration } from "astro";

export function sveltiaIntegration(): AstroIntegration {
    return {
        name: "sourcepoet-sveltia",

        hooks: {
            "astro:config:setup": ({ injectRoute }) => {
                injectRoute({
                    pattern: "/oauth",
                    entrypoint: new URL("./oauth/login.ts", import.meta.url),
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
            },
        },
    };
}