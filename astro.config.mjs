// @ts-check
import { defineConfig } from 'astro/config';
// import { sveltiaIntegration } from "./src/integrations/sveltia";
import { sveltiaIntegration } from "./src/integrations/sveltia/index.ts";
import { cmsConfig } from "./src/cms/config.ts";

import tailwindcss from '@tailwindcss/vite';

// import sveltia from "astro-loader-sveltia-cms";

// https://astro.build/config
export default defineConfig({
  integrations: [
    sveltiaIntegration({
      config: cmsConfig,
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});