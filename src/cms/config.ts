import {defineCmsConfig} from "@sourcepoetry/astro-sveltia";

export const cmsConfig = defineCmsConfig({
    backend: {
        name: "github",
        repo: "rewelser/sourcepoet",
        branch: "main",
    },

    media_folder: "public/uploads",
    public_folder: "/uploads",

    collections: [
        {
            name: "site",
            label: "Site",

            astro: {
                image: "local",
            },

            files: [
                {
                    name: "info",
                    label: "Site Info",
                    file: "src/content/site/info.json",
                    format: "json",

                    fields: [
                        {
                            name: "siteName",
                            label: "Site / Business Name",
                            widget: "string",
                            required: false,
                        },
                        {
                            name: "legalName",
                            label: "Legal Business Name",
                            widget: "string",
                            required: false,
                            hint: "Optional. If omitted, the site name will be used.",
                        },
                        {
                            name: "siteUrl",
                            label: "Full Site URL",
                            widget: "string",
                            type: "url",
                            required: false,
                        },
                        {
                            name: "description",
                            label: "Business Description",
                            widget: "text",
                            required: false,
                        },
                        {
                            name: "schemaType",
                            label: "Schema.org Business Type",
                            widget: "string",
                            required: false,
                            hint: 'Schema.org type such as "LocalBusiness".',
                        },
                        {
                            name: "address",
                            label: "Address",
                            widget: "object",
                            required: false,

                            fields: [
                                {
                                    name: "streetAddress",
                                    label: "Street",
                                    widget: "string",
                                    required: false,
                                },
                                {
                                    name: "addressLocality",
                                    label: "City / Locality",
                                    widget: "string",
                                    required: false,
                                },
                                {
                                    name: "addressRegion",
                                    label: "State / Region",
                                    widget: "string",
                                    required: false,
                                },
                                {
                                    name: "postalCode",
                                    label: "Postal Code",
                                    widget: "string",
                                    required: false,
                                },
                                {
                                    name: "addressCountry",
                                    label: "Country Code",
                                    widget: "string",
                                    required: false,
                                    hint: "ISO 3166-1 alpha-2 country code, e.g. US.",
                                    pattern: [
                                        "^[A-Z]{2}$",
                                        "Use a 2-letter ISO country code, e.g. US.",
                                    ],
                                },
                            ],
                        },
                        {
                            name: "placeId",
                            label: "Google Maps Place ID",
                            widget: "string",
                            required: false,
                        },
                        {
                            name: "mapHref",
                            label: "Map URL",
                            widget: "string",
                            type: "url",
                            required: false,
                        },
                        {
                            name: "timeZone",
                            label: "Time Zone",
                            widget: "string",
                            required: false,
                            hint: 'IANA time zone, e.g. "America/New_York".',
                        },
                        {
                            name: "phone",
                            label: "Phone Number",
                            widget: "string",
                            required: false,
                        },
                        {
                            name: "email",
                            label: "Email",
                            widget: "string",
                            type: "email",
                            required: false,
                        },
                        {
                            name: "hours",
                            label: "Hours",
                            widget: "list",
                            required: false,

                            fields: [
                                {
                                    name: "days",
                                    label: "Days",
                                    widget: "select",
                                    multiple: true,

                                    options: [
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                        "Saturday",
                                        "Sunday",
                                    ],
                                },
                                {
                                    name: "closed",
                                    label: "Closed",
                                    widget: "boolean",
                                    required: false,
                                    default: false,
                                },
                                {
                                    name: "opens",
                                    label: "Opening Time",
                                    widget: "string",
                                    required: false,
                                    hint: "24-hour time, e.g. 12:00.",
                                    pattern: [
                                        "^([01]\\d|2[0-3]):[0-5]\\d$",
                                        "Use 24-hour HH:MM format, e.g. 12:00.",
                                    ],
                                },
                                {
                                    name: "closes",
                                    label: "Closing Time",
                                    widget: "string",
                                    required: false,
                                    hint: "24-hour time, e.g. 19:00.",
                                    pattern: [
                                        "^([01]\\d|2[0-3]):[0-5]\\d$",
                                        "Use 24-hour HH:MM format, e.g. 19:00.",
                                    ],
                                },
                            ],
                        },
                        {
                            name: "hoursShortline",
                            label: "Hours Shortline",
                            widget: "text",
                            required: false,
                            hint: "Human-readable summary of the business hours.",
                        },
                        {
                            name: "socials",
                            label: "Socials",
                            widget: "object",
                            required: false,
                            collapsed: true,

                            fields: [
                                {
                                    name: "instagram",
                                    label: "Instagram",
                                    widget: "string",
                                    type: "url",
                                    required: false,
                                },
                                {
                                    name: "tiktok",
                                    label: "TikTok",
                                    widget: "string",
                                    type: "url",
                                    required: false,
                                },
                                {
                                    name: "youtube",
                                    label: "YouTube",
                                    widget: "string",
                                    type: "url",
                                    required: false,
                                },
                                {
                                    name: "facebook",
                                    label: "Facebook",
                                    widget: "string",
                                    type: "url",
                                    required: false,
                                },
                                {
                                    name: "x",
                                    label: "X (Twitter)",
                                    widget: "string",
                                    type: "url",
                                    required: false,
                                },
                                {
                                    name: "threads",
                                    label: "Threads",
                                    widget: "string",
                                    type: "url",
                                    required: false,
                                },
                                {
                                    name: "tumblr",
                                    label: "Tumblr",
                                    widget: "string",
                                    type: "url",
                                    required: false,
                                },
                                {
                                    name: "pinterest",
                                    label: "Pinterest",
                                    widget: "string",
                                    type: "url",
                                    required: false,
                                },
                            ],
                        },
                        {
                            name: "privacyPolicy",
                            label: "Privacy Policy",
                            widget: "file",
                            required: false,
                            media_folder: "{{dirname}}/assets/policies",
                            public_folder: "assets/policies",
                        },
                    ],
                },

                {
                    name: "branding",
                    label: "Branding",
                    file: "src/content/site/branding.json",
                    format: "json",

                    media_folder: "assets/images",
                    public_folder: "assets/images",

                    fields: [
                        {
                            name: "logoDefault",
                            label: "Default Logo",
                            widget: "image",
                            required: false,
                            hint: "General-purpose logo. A built-in fallback is used if omitted.",
                        },
                        {
                            name: "logoDark",
                            label: "Logo — Dark",
                            widget: "image",
                            required: false,
                            hint: "Dark-on-light logo. Falls back to the default logo if omitted.",
                        },
                        {
                            name: "logoLight",
                            label: "Logo — Light",
                            widget: "image",
                            required: false,
                            hint: "Light-on-dark logo. Falls back to the default logo if omitted.",
                        },
                        {
                            name: "sitewideOGPhoto",
                            label: "Sitewide Open Graph Image",
                            widget: "image",
                            required: false,

                            astro: {
                                image: "public",
                            },

                            media_folder: "public/uploads/ogimages",
                            public_folder: "/uploads/ogimages",

                            hint: "Fallback image used when sharing pages without a page-specific social image.",
                        },
                        {
                            name: "hero",
                            label: "Hero",
                            widget: "object",
                            required: false,

                            fields: [
                                {
                                    name: "image",
                                    label: "Hero Image",
                                    widget: "image",
                                    required: false,
                                },
                                {
                                    name: "imageAltText",
                                    label: "Hero Image Alt Text",
                                    widget: "string",
                                    required: false,
                                },
                                {
                                    name: "video",
                                    label: "Hero Video",
                                    widget: "object",
                                    required: false,

                                    fields: [
                                        {
                                            name: "mobile",
                                            label: "Mobile Video",
                                            widget: "file",
                                            required: false,
                                            media_folder: "public/uploads/misc_videos",
                                            public_folder: "/uploads/misc_videos",
                                        },
                                        {
                                            name: "desktop",
                                            label: "Desktop Video",
                                            widget: "file",
                                            required: false,
                                            media_folder: "public/uploads/misc_videos",
                                            public_folder: "/uploads/misc_videos",
                                        },
                                        {
                                            name: "posterMobile",
                                            label: "Mobile Video Poster",
                                            widget: "image",
                                            required: false,
                                        },
                                        {
                                            name: "posterDesktop",
                                            label: "Desktop Video Poster",
                                            widget: "image",
                                            required: false,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
});