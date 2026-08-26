import type { CmsConfig } from "@sveltia/cms";

export function defineCmsConfig<const T extends CmsConfig>(config: T): T {
    return config;
}