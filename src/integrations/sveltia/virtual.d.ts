declare module "virtual:sourcepoet-sveltia/config" {
    import type {CmsConfig} from "@sveltia/cms";

    export const config: CmsConfig;
    export const title: string;

    export const githubOAuth: {
        enabled: boolean;

        clientIdEnv: string;
        clientSecretEnv: string;

        authPath: string;
        callbackPath: string;

        authEndpoint: string;

        scopes: string[];
    };
}

declare module "virtual:sourcepoet-sveltia/images" {
    import type {ImageMetadata} from "astro";

    export function resolveSveltiaImage(path: string): Promise<{ default: ImageMetadata; }>;
}