// src/cms/config.ts

import type { CmsConfig } from "@sveltia/cms";

export const cmsConfig = {
    load_config_file: false,

    backend: {
        name: "github",
        repo: "YOUR-OWNER/YOUR-REPO",
        branch: "main",
    },

    // Keep the rest of your actual existing Sveltia config here:
    //
    // media_folder: ...
    // public_folder: ...
    // collections: [...]
    // singletons: [...]
} satisfies CmsConfig;