// @ts-check
import {defineConfig} from 'astro/config';
import sveltia from "@sourcepoetry/astro-sveltia";
import {cmsConfig} from "./src/cms/config.ts";

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
    integrations: [
        sveltia({
            config: cmsConfig,
            githubOAuth: false,
        }),
    ],
    vite: {
        plugins: [tailwindcss()]
    }
});