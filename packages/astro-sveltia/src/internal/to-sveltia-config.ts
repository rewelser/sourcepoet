import type { CmsConfig } from "@sveltia/cms";

type AnyObject = Record<string, any>;

function stripField(field: AnyObject): AnyObject {
    const {
        astro: _astro,
        field: childField,
        fields,
        types,
        ...rest
    } = field;

    if (childField) {
        rest.field = stripField(childField);
    }

    if (Array.isArray(fields)) {
        rest.fields = fields.map(stripField);
    }

    if (Array.isArray(types)) {
        rest.types = types.map((type) => {
            const { astro: _typeAstro, fields: typeFields, ...typeRest } = type;

            if (Array.isArray(typeFields)) {
                typeRest.fields = typeFields.map(stripField);
            }

            return typeRest;
        });
    }

    return rest;
}

function stripFile(file: AnyObject): AnyObject {
    const { astro: _astro, fields, ...rest } = file;

    if (Array.isArray(fields)) {
        rest.fields = fields.map(stripField);
    }

    return rest;
}

function stripCollection(collection: AnyObject): AnyObject {
    const { astro: _astro, fields, files, ...rest } = collection;

    if (Array.isArray(fields)) {
        rest.fields = fields.map(stripField);
    }

    if (Array.isArray(files)) {
        rest.files = files.map(stripFile);
    }

    return rest;
}

function stripSingleton(singleton: AnyObject): AnyObject {
    const { astro: _astro, fields, ...rest } = singleton;

    if (Array.isArray(fields)) {
        rest.fields = fields.map(stripField);
    }

    return rest;
}

export function toSveltiaConfig(config: CmsConfig): CmsConfig {
    return {
        ...config,

        collections: config.collections?.map((collection) =>
            stripCollection(collection as AnyObject),
        ) as CmsConfig["collections"],

        singletons: config.singletons?.map((singleton) =>
            stripSingleton(singleton as AnyObject),
        ) as CmsConfig["singletons"],

        load_config_file: false,
    };
}