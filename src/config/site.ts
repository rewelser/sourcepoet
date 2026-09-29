import {getCmsFileEntry} from "@sourcepoetry/astro-sveltia/content";
import {cmsConfig} from "../cms/config.ts";
import logoDefault from "./assets/generic-logo.svg";
import personProfilePictureDefault from "./assets/default-profile-picture.jpg";
import personPortraitPictureDefault from "./assets/default-portrait-picture.svg";
import teamPictureDefault from "./assets/default-team-picture.jpg";
import type {MergeDefined} from "./types.ts";


/**
 * A branding shape with hero sub-object may be something like (Based off of BluTattoo):
 *
 * {
 *   logoDefault,
 *   sitewideOGPhoto: "./public/uploads/ogimages/default_sitewide_og.jpg",
 *   hero: {
 *     video: {
 *       videoMobile: "/uploads/misc_videos/hero-mobile.webm",
 *       videoDesktop: "/uploads/misc_videos/hero_desktop.webm",
 *       posterMobile,
 *       posterDesktop
 *     },
 *     picture: {
 *         heroPicture,
 *         heroPictureAltText: "hero picture alt text"
 *     }
 *   }
 * }
 *
 * But this doesn't have to exist as a default, and in fact probably shouldn't, since not all websites/pages
 * may have a need for this structure, but I'm putting this here as a guide.
 */
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
        logoDefault,
        ogImageDefault: "./public/uploads/ogimages/default_sitewide_og.jpg"
    },
    team: {
        personProfilePictureDefault,
        personPortraitPictureDefault,
        teamPictureDefault,
    }
}

function buildBusinessSchema(
    info: Awaited<ReturnType<typeof resolveInfo>>,
    branding: Awaited<ReturnType<typeof resolveBranding>>,
) {
    return {
        "@context": "https://schema.org",
        "@type": info.schemaType,
        "@id": `${info.siteUrl}/#business`,
        name: info.siteName,
        legalName: info.legalName,
        url: info.siteUrl,
        telephone: info.phone,
        email: info.email,
        logo: branding.logoDefault.src,

        address: {
            "@type": "PostalAddress",
            ...info.address,
        },

        ...(info.mapHref && {hasMap: info.mapHref}),

        ...(info.placeId && {
            identifier: {
                "@type": "PropertyValue",
                propertyID: "Google Place ID",
                value: info.placeId,
            },
        }),

        sameAs: Object.values(info.socials).filter(
            (value): value is string => typeof value === "string",
        ),

        openingHoursSpecification: info.hours.map((hours) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: hours.days,
            ...(!hours.closed && {
                opens: hours.opens,
                closes: hours.closes,
            }),
        })),
    };
}

async function resolveInfo() {
    const entry = await getCmsFileEntry(cmsConfig, "site", "info");
    const info = mergeDefined(defaults.info, entry?.data);

    return {
        ...info,
        legalName: info.legalName ?? info.siteName,
    };
}

async function resolveBranding() {
    const entry = await getCmsFileEntry(cmsConfig, "site", "branding");
    const branding = mergeDefined(defaults.branding, entry?.data);

    return {
        ...branding,
        logoDark: branding.logoDark ?? branding.logoDefault,
        logoLight: branding.logoLight ?? branding.logoDefault,
    };
}

export async function getSiteConfig() {
    const [info, branding] = await Promise.all([
        resolveInfo(),
        resolveBranding(),
    ]);

    return {
        info,
        branding,
        schema: buildBusinessSchema(info, branding),
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeDefined<D extends object, O extends object | undefined>(defaults: D, overrides: O): MergeDefined<D, O> {
    if (!overrides) return defaults as MergeDefined<D, O>;

    const result = {...defaults} as Record<string, unknown>;

    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) continue;

        const fallback = result[key];

        result[key] =
            isRecord(fallback) && isRecord(value)
                ? mergeDefined(fallback, value)
                : value;
    }

    return result as MergeDefined<D, O>;
}