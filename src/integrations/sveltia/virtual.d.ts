declare module "virtual:sourcepoet-sveltia/config" {
    import type {
        CmsConfig,
    } from "@sveltia/cms";

    export const config: CmsConfig;
    export const title: string;
}