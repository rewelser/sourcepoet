export {defineCmsConfig} from "./define-config.ts";

export {
    defineCmsCollection,
    defineCmsFileCollection,
    defineCmsSingleton,
} from "./collections.ts";

export {
    getCmsCollection,
    getCmsFile,
    getCmsSingleton,
} from "./query-config.ts";

export {getCmsFileEntry} from "./get-file-entry.ts";

export type {
    CmsAstroOptions,
    CmsField,
    CmsSchemaOptions,
    AstroFieldOptions,
} from "./schema-types.ts";