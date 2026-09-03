import {
    defineCmsCollection,
    defineCmsFileCollection,
    defineCmsSingleton,
    getCmsCollection,
    getCmsSingleton,
} from "@sourcepoetry/astro-sveltia/content";

import {cmsConfig} from "./cms/config";

// const posts = defineCmsCollection(getCmsCollection(cmsConfig, "posts"));
// const authors = defineCmsCollection(getCmsCollection(cmsConfig, "authors"));
const site = defineCmsFileCollection(getCmsCollection(cmsConfig, "site"));
// const branding = defineCmsSingleton(getCmsSingleton(cmsConfig, "branding"));
// const navigation = defineCmsSingleton(getCmsSingleton(cmsConfig, "navigation"));

export const collections = {
    // posts,
    // authors,
    site,
    // branding,
    // navigation,
};