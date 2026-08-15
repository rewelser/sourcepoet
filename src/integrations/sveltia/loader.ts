import {posix} from "node:path";

import {glob} from "astro/loaders";
import type {Loader, LoaderContext} from "astro/loaders";
import type {Field} from "@sveltia/cms";

import {transformFieldValues} from "./transforms.ts";
import {
    readCmsConfig,
    resolveSveltiaSource,
    type ResolvedSveltiaSource,
    type SveltiaSourceSelector,
    type FolderCollection,
} from "./config";

import {buildSourceSchema} from "./type-gen";
import {getWidget} from "./schema";
import {getSourceMediaContext, type SveltiaMediaContext} from "./media.ts";

type ConfigRecord = Record<string, unknown>;

function getStringProperty(value: unknown, key: string): string | undefined {
    if (
        typeof value !== "object" ||
        value === null
    ) {
        return undefined;
    }

    const property = (value as ConfigRecord)[key];

    return typeof property === "string" ? property : undefined;
}

function getObjectProperty(value: unknown, key: string): ConfigRecord | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }

    const property = (value as ConfigRecord)[key];

    return (
        typeof property === "object" &&
        property !== null &&
        !Array.isArray(property)
    )
        ? property as ConfigRecord
        : undefined;
}

function getSourceFields(source: ResolvedSveltiaSource) {
    switch (source.kind) {
        case "folder":
            return source.collection.fields;
        case "file":
            return source.file.fields;
        case "singleton":
            return source.singleton.fields;
    }
}

function loadSingleFile(filepath: string, context: Parameters<Loader["load"]>[0]) {
    const normalizedPath = filepath.replaceAll("\\", "/");
    const base = posix.dirname(normalizedPath);
    const pattern = posix.basename(normalizedPath);
    const loader = glob({base, pattern});

    return loader.load(context);
}

function withTransforms(
    context: LoaderContext,
    fields: Field[],
    rootField?: Field,
    media?: SveltiaMediaContext,
): LoaderContext {
    return {
        ...context,

        parseData: async <TData extends Record<string, unknown>>(
            options: {
                id: string;
                data: TData;
                filePath?: string;
            },
        ) => {
            const rawData = (options as { data: unknown; }).data;

            let normalizedData: Record<string, unknown>;

            if (rootField) {
                normalizedData = {[rootField.name]: rawData};
            } else {
                if (
                    typeof rawData !==
                    "object" ||
                    rawData === null ||
                    Array.isArray(rawData)
                ) {
                    throw new Error(
                        `[sveltiaLoader] Entry "${options.id}" ` +
                        `produced root-level non-object data, ` +
                        `but no effective root field is configured.`,
                    );
                }

                normalizedData = rawData as Record<string, unknown>;
            }

            const transformed = await transformFieldValues(
                normalizedData,
                fields,
                {
                    media,
                    filePath: options.filePath,
                    root: context.config.root
                }
            );

            console.log(
                "[sveltia loader] transformed:",
                transformed,
            );

            console.log(
                "[sveltia loader] hero:",
                transformed.hero,
            );

            return context.parseData({...options, data: transformed as TData});
        },
    };
}

export function sveltiaLoader(
    selector: SveltiaSourceSelector,
): Loader {
    return {
        name: "sourcepoet-sveltia",

        async createSchema() {
            const config = readCmsConfig();

            const source = resolveSveltiaSource(config, selector);

            const media = getSourceMediaContext(config, source);

            return buildSourceSchema(
                getSourceFields(source),
                getBodyFieldKey(source),
                {media},
            );
        },

        async load(context) {
            const config = readCmsConfig();
            const source = resolveSveltiaSource(config, selector);
            const fields = getSourceFields(source);
            const rootField = getRootField(source);
            const media = getSourceMediaContext(config, source);

            const transformedContext =
                withTransforms(
                    context,
                    fields,
                    rootField,
                    media,
                );

            switch (source.kind) {
                case "folder": {
                    const extension = getFolderExtension(source.collection);

                    const loader = glob({
                        pattern: `**/*.${extension}`,
                        base: source.collection.folder,
                    });

                    return loader.load(transformedContext);
                }
                case "file":
                    return loadSingleFile(source.file.file, transformedContext);

                case "singleton":
                    return loadSingleFile(source.singleton.file, transformedContext);
            }
        },
    };
}

function inferFileFormat(
    filePath: string,
): string {
    const extension =
        posix
            .extname(filePath)
            .toLowerCase();

    switch (extension) {
        case ".yaml":
        case ".yml":
            return "yaml";

        case ".json":
            return "json";

        case ".toml":
            return "toml";

        case ".md":
        case ".markdown":
            return "yaml-frontmatter";

        default:
            return "yaml-frontmatter";
    }
}

function getSourceFormat(
    source: ResolvedSveltiaSource,
): string {
    switch (source.kind) {
        case "folder":
            return (getStringProperty(source.collection, "format") ?? "yaml-frontmatter");

        case "file":
            return (
                getStringProperty(source.file, "format") ??
                getStringProperty(source.collection, "format") ??
                inferFileFormat(source.file.file)
            );

        case "singleton":
            return (
                getStringProperty(source.singleton, "format") ??
                inferFileFormat(source.singleton.file)
            );
    }
}

function isFrontmatterFormat(
    format: string,
): boolean {
    return (
        format === "yaml-frontmatter" ||
        format === "toml-frontmatter" ||
        format === "json-frontmatter" ||
        format === "frontmatter"
    );
}

function getBodyFieldConfig(
    source: ResolvedSveltiaSource,
): ConfigRecord | undefined {
    switch (source.kind) {
        case "folder":
            return getObjectProperty(source.collection, "body_field");

        case "file":
            return (
                getObjectProperty(source.file, "body_field") ??
                getObjectProperty(source.collection, "body_field")
            );

        case "singleton":
            return getObjectProperty(source.singleton, "body_field");
    }
}

function getBodyFieldKey(
    source: ResolvedSveltiaSource,
): string | undefined {
    const format = getSourceFormat(source);

    if (!isFrontmatterFormat(format)) {
        return undefined;
    }

    const bodyField = getBodyFieldConfig(source);

    if (bodyField?.inline === true) {
        return undefined;
    }

    return (
        typeof bodyField?.key === "string"
            ? bodyField.key
            : "body"
    );
}

function getFolderExtension(collection: FolderCollection): string {
    if (
        typeof collection.extension ===
        "string"
    ) {
        return collection.extension;
    }

    const format = getStringProperty(collection, "format") ?? "yaml-frontmatter";

    switch (format) {
        case "yaml":
        case "yml":
            return "yml";

        case "json":
            return "json";

        case "toml":
            return "toml";

        case "yaml-frontmatter":
        case "toml-frontmatter":
        case "json-frontmatter":
        case "frontmatter":
            return "md";

        case "raw":
            return "txt";

        default:
            throw new Error(
                `[sveltiaLoader] Cannot infer an ` +
                `extension for custom format ` +
                `"${format}". Set "extension" ` +
                `explicitly on the collection.`,
            );
    }
}

function getRootField(source: ResolvedSveltiaSource): Field | undefined {
    if (source.kind === "folder") {
        return undefined;
    }

    const fields = getSourceFields(source);

    if (fields.length !== 1) {
        return undefined;
    }

    const field = fields[0];

    const record = field as Field & Record<string, unknown>;

    if (record.root !== true) {
        return undefined;
    }

    const widget = getWidget(field);

    if (
        widget !== "list" &&
        widget !== "keyvalue"
    ) {
        return undefined;
    }

    if (
        widget === "list" &&
        getSourceFormat(source) === "toml"
    ) {
        return undefined;
    }

    return field;
}