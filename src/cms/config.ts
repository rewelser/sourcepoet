import type {CmsConfig} from "@sveltia/cms";

export const cmsConfig = {
    backend: {
        name: "github",
        repo: "rewelser/sourcepoet",
        branch: "main",
    },

    media_folder: "public/uploads",
    public_folder: "/uploads",

    collections: [
        {
            name: "posts",
            label: "Posts",
            folder: "src/content/posts",
            body_field: {key: "content"},

            path: "{{slug}}/index",

            media_folder: "",
            public_folder: "",

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
                {
                    name: "author",
                    label: "Author",
                    widget: "relation",

                    collection: "authors",

                    search_fields: [
                        "name",
                    ],

                    display_fields: [
                        "name",
                    ],

                    value_field: "{{slug}}",
                },
            ],
        },
        {
            name: "settings",
            label: "Settings",

            files: [
                {
                    name: "site",
                    label: "Site Settings",
                    file: "src/content/settings/site.yaml",

                    fields: [
                        {
                            name: "siteName",
                            label: "Site Name",
                            widget: "string",
                        }
                    ]
                }
            ]
        },
        {
            name: "authors",
            label: "Authors",
            folder: "src/content/authors",

            fields: [
                {
                    name: "name",
                    label: "Name",
                    widget: "string",
                },
            ],
        },
    ],

    singletons: [
        {
            name: "branding",
            label: "Branding",
            file: "src/content/branding/main.yaml",

            fields: [
                {
                    name: "name",
                    label: "Brand Name",
                    widget: "string",
                },
                {
                    name: "theme",
                    label: "Theme",
                    widget: "select",

                    options: [
                        "light",
                        "dark",
                    ],
                },
                {
                    name: "logo",
                    label: "Logo",
                    widget: "image",
                    required: false,
                },
                {
                    name: "identity",
                    label: "Identity",
                    widget: "object",

                    fields: [
                        {
                            name: "displayName",
                            label: "Display Name",
                            widget: "string",
                        },
                        {
                            name: "tagline",
                            label: "Tagline",
                            widget: "string",
                            required: false,
                        },
                    ],
                },
                {
                    name: "socials",
                    label: "Social Links",
                    widget: "list",

                    fields: [
                        {
                            name: "platform",
                            label: "Platform",
                            widget: "select",
                            options: [
                                "github",
                                "instagram",
                                "linkedin",
                            ],
                        },
                        {
                            name: "url",
                            label: "URL",
                            widget: "string",
                        },
                    ],
                },
                {
                    name: "keywords",
                    label: "Keywords",
                    widget: "list",
                },
                // {
                //     name: "years",
                //     label: "Years",
                //     widget: "list",
                //
                //     field: {
                //         name: "year",
                //         label: "Year",
                //         widget: "number",
                //     },
                // },
                {
                    name: "blocks",
                    label: "Content Blocks",
                    widget: "list",

                    types: [
                        {
                            name: "heading",
                            label: "Heading",

                            fields: [
                                {
                                    name: "text",
                                    label: "Text",
                                    widget: "string",
                                },

                                {
                                    name: "level",
                                    label: "Level",
                                    widget: "select",

                                    options: [
                                        "h2",
                                        "h3",
                                    ],
                                },
                            ],
                        },

                        {
                            name: "paragraph",
                            label: "Paragraph",

                            fields: [
                                {
                                    name: "text",
                                    label: "Text",
                                    widget: "text",
                                },
                            ],
                        },
                    ],
                },
                {
                    name: "priority",
                    label: "Priority",
                    widget: "number",
                    value_type: "int",
                    min: 1,
                    max: 5,
                },
                {
                    name: "identifier",
                    label: "Identifier",
                    widget: "uuid",
                },
                {
                    name: "metadata",
                    label: "Metadata",
                    widget: "keyvalue",
                },
            ],
        },
        {
            name: "navigation",
            label: "Navigation",
            file: "src/content/navigation/main.yaml",

            fields: [
                {
                    name: "items",
                    label: "Items",
                    widget: "list",
                    root: true,

                    fields: [
                        {
                            name: "label",
                            label: "Label",
                            widget: "string",
                        },
                        {
                            name: "href",
                            label: "URL",
                            widget: "string",
                        },
                    ],
                },
            ],
        },
    ]
} satisfies CmsConfig;