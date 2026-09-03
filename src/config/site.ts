import {getCmsFileEntry} from "@sourcepoetry/astro-sveltia/content";
import {cmsConfig} from "../cms/config.ts";
import defaultLogo from "./assets/paper1.jpg";

const defaults = {
    info: {
        siteName: "Company Name",
        siteUrl: "https://www.example.com/",
        schemaType: "LocalBusiness",
        timeZone: "America/New_York",
        phone: "(555) 555-5555",
        email: "info@company.com",
        address: {
            streetAddress: "123 Main St",
            addressLocality: "Anytown",
            addressRegion: "VA",
            postalCode: "00000",
            addressCountry: "US",
        },
        hours: [],
        hoursShortline: "",
        socials: {},
    },
    branding: {
        logoDefault: defaultLogo
    }
}

export async function getSiteConfig() {
    const [infoEntry, brandingEntry] = await Promise.all([
        getCmsFileEntry(cmsConfig, "site", "info"),
        getCmsFileEntry(cmsConfig, "site", "branding")
    ])

    const info = mergeDefined(defaults.info, infoEntry?.data);
    const branding = mergeDefined(defaults.branding, brandingEntry?.data);

    return {
        info: {
            ...info,
            legalName: info.legalName ?? info.siteName,
        },

        branding: {
            ...branding,
            logoDark: branding.logoDark ?? branding.logoDefault,
            logoLight: branding.logoLight ?? branding.logoDefault,

        }
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeDefined<D extends object, O extends object | undefined>(defaults: D, overrides: O): D & NonNullable<O> {
    if (!overrides) return defaults as D & NonNullable<O>;

    const result = {...defaults} as Record<string, unknown>;

    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) continue;

        const fallback = result[key];

        result[key] = isRecord(fallback) && isRecord(value) ? mergeDefined(fallback, value) : value;

    }
    return result as D & NonNullable<O>;

}