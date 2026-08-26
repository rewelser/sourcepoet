# @sourcepoetry/astro-sveltia

A typed Sveltia CMS integration and content adapter for Astro.

`@sourcepoetry/astro-sveltia` lets a Sveltia CMS configuration serve as the source of truth for both the CMS and Astro Content Collections. Define your fields once, add a small amount of Astro-specific metadata where necessary, and get runtime validation and precise TypeScript types through Astro's normal content APIs.

```ts
const post = await getEntry("posts", "hello");

post?.data.title;
// string

post?.data.hero;
// ImageMetadata
```

## Requirements

- Astro 7+
- Sveltia CMS

## Installation

```bash
npm install @sourcepoetry/astro-sveltia
```

## Basic setup

A project using `@sourcepoetry/astro-sveltia` generally has two project-owned CMS files:

```text
src/
├── cms/
│   └── config.ts
└── content.config.ts
```

`src/cms/config.ts` defines the content model.

`src/content.config.ts` registers those definitions as Astro Content Collections.

### 1. Define the CMS configuration

```ts
// src/cms/config.ts

import {defineCmsConfig} from "@sourcepoetry/astro-sveltia";

export const cmsConfig = defineCmsConfig({
    backend: {
        name: "github",
        repo: "owner/repository",
        branch: "main",
    },

    media_folder: "public/uploads",
    public_folder: "/uploads",

    collections: [
        {
            name: "posts",
            label: "Posts",
            folder: "src/content/posts",

            astro: {
                pattern: "**/*.md",
                image: "local",
                bodyMode: "document",
                bodyField: "content",
            },

            fields: [
                {
                    name: "title",
                    label: "Title",
                    widget: "string",
                },
                {
                    name: "hero",
                    label: "Hero",
                    widget: "image",
                },
                {
                    name: "content",
                    label: "Content",
                    widget: "markdown",
                },
            ],
        },

        {
            name: "site",
            label: "Site",

            files: [
                {
                    name: "about",
                    label: "About",
                    file: "src/content/site/about.yaml",

                    fields: [
                        {
                            name: "title",
                            label: "Title",
                            widget: "string",
                        },
                        {
                            name: "description",
                            label: "Description",
                            widget: "text",
                        },
                    ],
                },

                {
                    name: "settings",
                    label: "Settings",
                    file: "src/content/site/settings.yaml",

                    fields: [
                        {
                            name: "siteName",
                            label: "Site Name",
                            widget: "string",
                        },
                    ],
                },
            ],
        },
    ],
});
```

`defineCmsConfig()` validates the object against Sveltia's configuration type while preserving the literal information used to infer Astro content types.

Astro-specific properties live under `astro`. They are stripped before the configuration is passed to Sveltia.

### 2. Register the Astro collections

```ts
// src/content.config.ts

import {
    defineCmsCollection,
    defineCmsFileCollection,
    getCmsCollection,
} from "@sourcepoetry/astro-sveltia/content";

import {cmsConfig} from "./cms/config";

const posts = defineCmsCollection(
    getCmsCollection(cmsConfig, "posts"),
);

const site = defineCmsFileCollection(
    getCmsCollection(cmsConfig, "site"),
);

export const collections = {
    posts,
    site,
};
```

`content.config.ts` is only responsible for registration. Collection fields, image behavior, body behavior, and other CMS semantics remain with the collection definition in `cms/config.ts`.

### 3. Add the Astro integration

```ts
// astro.config.mjs

import {defineConfig} from "astro/config";
import sveltia from "@sourcepoetry/astro-sveltia";

import {cmsConfig} from "./src/cms/config.ts";

export default defineConfig({
    integrations: [
        sveltia({
            config: cmsConfig,
        }),
    ],
});
```

The CMS is then available at:

```text
/admin
```

## Querying content

Ordinary collections use Astro's native content APIs.

```ts
import {getEntry} from "astro:content";

const post = await getEntry("posts", "hello");

if (!post) {
    throw new Error("Post not found.");
}

post.data.title;
// string
```

The generated types come from the same Sveltia field definitions used by the CMS.

## File collections

Sveltia file collections can contain entries with different schemas:

```text
site
├── about
└── settings
```

They remain one Astro collection:

```ts
import {getEntry} from "astro:content";

const about = await getEntry("site", "about");
const settings = await getEntry("site", "settings");
```

Because Astro types a collection as a whole, `getEntry()` sees the possible data shapes for the entire heterogeneous collection.

When exact per-file narrowing is useful, use `getCmsFileEntry()`:

```ts
import {getCmsFileEntry} from "@sourcepoetry/astro-sveltia/content";
import {cmsConfig} from "../cms/config";

const about = await getCmsFileEntry(
    cmsConfig,
    "site",
    "about",
);

if (!about) {
    throw new Error("About entry not found.");
}

about.data.title;
// string

about.data.siteName;
// TypeScript error
```

`getCmsFileEntry()` is an additional helper for heterogeneous file collections. It is not a replacement for Astro's `getEntry()`.

## Singletons

Sveltia singletons can also be registered as Astro collections.

```ts
// cms/config.ts

export const cmsConfig = defineCmsConfig({
    // ...

    singletons: [
        {
            name: "branding",
            label: "Branding",
            file: "src/content/branding/main.yaml",

            astro: {
                image: "local",
            },

            fields: [
                {
                    name: "name",
                    label: "Name",
                    widget: "string",
                },
                {
                    name: "logo",
                    label: "Logo",
                    widget: "image",
                    required: false,
                },
            ],
        },
    ],
});
```

Register it:

```ts
import {
    defineCmsSingleton,
    getCmsSingleton,
} from "@sourcepoetry/astro-sveltia/content";

const branding = defineCmsSingleton(
    getCmsSingleton(cmsConfig, "branding"),
);

export const collections = {
    branding,
};
```

Then use the normal Astro API:

```ts
const branding = await getEntry("branding", "main");
```

The default entry ID is derived from the filename:

```text
src/content/branding/main.yaml
                         ↓
                       "main"
```

A singleton's backing file does not need to exist yet. This allows Sveltia to present the singleton in the CMS before the user has created it.

## Images

Image behavior is explicit.

### Local Astro images

```ts
astro: {
    image: "local",
}
```

An image field is parsed with Astro's native image schema and becomes `ImageMetadata`.

For example:

```yaml
---
title: Hello
hero: ./hero.jpg
---
```

then:

```ts
const post = await getEntry("posts", "hello");

post?.data.hero;
// ImageMetadata
```

Local images participate in Astro's asset pipeline and image optimization.

### Public images

Use:

```ts
astro: {
    image: "public",
}
```

for values such as:

```text
/uploads/logo.png
```

Public images remain strings.

### Field-level overrides

A field can override the collection default:

```ts
{
    name: "logo",
    label: "Logo",
    widget: "image",

    astro: {
        image: "public",
    },
}
```

For example, a collection may use local images generally while a particular field refers to an asset under `public/`.

## Document bodies

Markdown collections can map a Sveltia field to the document body:

```ts
astro: {
    pattern: "**/*.md",
    bodyMode: "document",
    bodyField: "content",
}
```

Given:

```ts
{
    name: "content",
    label: "Content",
    widget: "markdown",
}
```

Sveltia edits `content` as a field, while Astro treats it as the Markdown document body rather than a frontmatter property.

## Relations

Eligible Sveltia relation fields are translated to native Astro references.

For example:

```ts
{
    name: "author",
    label: "Author",
    widget: "relation",
    collection: "authors",
}
```

is exposed to Astro as a collection reference rather than an untyped string.

Relations with more specialized Sveltia semantics can remain primitive values instead.

A field can control this explicitly:

```ts
astro: {
    reference: false,
}
```

or specify a reference target:

```ts
astro: {
    reference: "authors",
}
```

## `root: true`

Top-level Sveltia `list` and `keyvalue` fields with `root: true` retain their serialized root shape.

For example:

```ts
{
    name: "items",
    widget: "list",
    root: true,

    fields: [
        {
            name: "label",
            widget: "string",
        },
        {
            name: "href",
            widget: "string",
        },
    ],
}
```

can produce:

```yaml
- label: Home
  href: /
- label: About
  href: /about
```

and Astro receives:

```ts
[
    {label: "Home", href: "/"},
    {label: "About", href: "/about"},
]
```

rather than:

```ts
{
    items: [...]
}
```

Root key-value documents are handled similarly.

Root lists are not used for TOML documents.

## GitHub OAuth

For a GitHub backend, `@sourcepoetry/astro-sveltia` includes an optional built-in OAuth server.

With:

```ts
sveltia({
    config: cmsConfig,
})
```

the built-in OAuth flow is automatically enabled when:

- the CMS backend is GitHub; and
- the backend does not already define an external `base_url`.

The flow uses:

- OAuth state validation;
- PKCE with SHA-256;
- an HttpOnly PKCE verifier cookie;
- server-side GitHub token exchange.

### Environment variables

By default:

```text
GITHUB_OAUTH_CLIENT_ID
GITHUB_OAUTH_CLIENT_SECRET
```

must contain the credentials for the GitHub OAuth application.

The default routes are:

```text
/auth
/callback
```

For local development, the GitHub OAuth application's callback URL would normally be:

```text
http://localhost:4321/callback
```

For production, configure the callback URL for the deployed domain.

### Custom OAuth options

```ts
sveltia({
    config: cmsConfig,

    githubOAuth: {
        clientIdEnv: "MY_GITHUB_CLIENT_ID",
        clientSecretEnv: "MY_GITHUB_CLIENT_SECRET",
        authPath: "/oauth/login",
        callbackPath: "/oauth/callback",
        scopes: ["repo", "user"],
    },
})
```

### Server adapter requirement

The built-in OAuth implementation injects server-rendered authorization and callback routes.

A production project using the built-in OAuth flow therefore requires an Astro server adapter appropriate for its deployment environment.

### Disabling the built-in OAuth server

```ts
sveltia({
    config: cmsConfig,
    githubOAuth: false,
})
```

disables the OAuth routes provided by `@sourcepoetry/astro-sveltia`.

This does **not** disable authentication mechanisms provided by Sveltia itself. With a GitHub backend, Sveltia may use another configured OAuth provider or its normal fallback authentication behavior.

If OAuth should be disabled entirely, configure the Sveltia backend's allowed authentication methods accordingly.

### Repository permissions

OAuth authentication does not grant a GitHub user access they do not already possess.

After authentication, Sveltia accesses the configured repository using that user's GitHub token. A user without the required repository access cannot enter or manage the CMS content for that repository.

## Missing content files

File collections and singletons may describe files that have not been created yet.

For example:

```text
src/content/branding/main.yaml
```

may initially be absent while the CMS still exposes the Branding singleton.

The adapter treats this as a valid state and removes stale Astro content-store entries when a configured file disappears.

## Astro configuration options

Collection-level Astro behavior is configured alongside the collection itself:

```ts
astro: {
    pattern: "**/*.md",
    image: "local",
    datetime: "string",
    relation: "string-or-number",
    bodyMode: "document",
    bodyField: "content",
    retainBody: true,
}
```

Supported image modes:

```ts
"local"
"public"
```

Supported datetime modes:

```ts
"string"
"date"
```

Supported primitive relation modes:

```ts
"string"
"number"
"string-or-number"
```

Fields may additionally define Astro-specific overrides:

```ts
astro: {
    image: "public",
    datetime: "date",
    reference: false,
}
```

## Public API

### `@sourcepoetry/astro-sveltia`

```ts
import sveltia, {
    defineCmsConfig,
    sveltiaIntegration,
    type GitHubOAuthOptions,
    type SveltiaIntegrationOptions,
} from "@sourcepoetry/astro-sveltia";
```

The default export and `sveltiaIntegration` are the same Astro integration factory.

### `@sourcepoetry/astro-sveltia/content`

```ts
import {
    defineCmsCollection,
    defineCmsFileCollection,
    defineCmsSingleton,

    getCmsCollection,
    getCmsFile,
    getCmsSingleton,
    getCmsFileEntry,

    type AstroFieldOptions,
    type CmsAstroOptions,
    type CmsDateTimeMode,
    type CmsField,
    type CmsImageMode,
    type CmsRelationMode,
    type CmsSchemaOptions,
} from "@sourcepoetry/astro-sveltia/content";
```

## Why?

Without an adapter, an Astro project using Sveltia typically has two parallel definitions of its content model:

```text
Sveltia configuration
        +
Astro collection schema
```

Those definitions can drift apart and must be maintained independently.

`@sourcepoetry/astro-sveltia` instead uses:

```text
                    ┌──→ Sveltia CMS
cmsConfig ──────────┤
                    └──→ Astro Content Collections
```

The Sveltia-shaped configuration remains the canonical content model, with a small set of Astro-specific annotations where the two systems need additional information.