import {defineCollection, type SchemaContext} from "astro:content";
import {glob, type Loader} from "astro/loaders";
import {z} from "astro/zod";
import {existsSync} from "node:fs";

import {
    sveltiaDocumentToAstroSchema,
    sveltiaFieldsToAstroSchema,
} from "./schema";

import {
    type CmsAstroOptions,
    type CmsField,
    type CmsSchemaOptions,
    type EffectiveCmsSchemaOptions,
    type InferSveltiaDocument,
    type InferSveltiaFields
} from "./schema-types";

/* ------------------------------------------------------------------ */
/* Shared                                                             */

/* ------------------------------------------------------------------ */

interface HasAstroOptions {
    astro?: CmsAstroOptions;
}

function normalizePath(path: string): string {
    return path.replace(/^\.?\//, "").replaceAll("\\", "/");
}

function schemaOptions(
    parent: HasAstroOptions,
    child?: HasAstroOptions,
): CmsSchemaOptions {
    return {
        ...(parent.astro ?? {}),
        ...(child?.astro ?? {}),
    };
}

function allowsRootList(path: string): boolean {
    return !path.toLowerCase().endsWith(".toml");
}

type AllowsRootList<Path extends string> =
    Lowercase<Path> extends `${string}.toml`
        ? false
        : true;

type DefinedCmsCollection<Data> =
    Omit<ReturnType<typeof defineCollection>, "schema"> & {
    schema: (context: SchemaContext) => z.ZodType<Data>;
};

type InferCmsEntryCollection<Collection extends CmsEntryCollection> =
    InferSveltiaFields<Collection["fields"], EffectiveCmsSchemaOptions<Collection>>;

type InferCmsSingleton<Singleton extends CmsSingleton, > =
    InferSveltiaDocument<Singleton["fields"], EffectiveCmsSchemaOptions<Singleton>, AllowsRootList<Singleton["file"]>>;

/* ------------------------------------------------------------------ */
/* Entry collections                                                  */

/* ------------------------------------------------------------------ */

export interface CmsEntryCollection<
    Fields extends readonly CmsField[] = readonly CmsField[],
> extends HasAstroOptions {
    name: string;
    folder: string;
    fields: Fields;
}

export function defineCmsCollection<
    const Collection extends CmsEntryCollection,
>(collection: Collection): DefinedCmsCollection<InferCmsEntryCollection<Collection>> {
    const pattern = collection.astro?.pattern;

    if (!pattern) {
        throw new Error(
            `CMS collection "${collection.name}" must define astro.pattern.`,
        );
    }

    const options = schemaOptions(collection) as EffectiveCmsSchemaOptions<Collection>;

    // return defineCollection({
    //     loader: glob({
    //         base: collection.folder,
    //         pattern,
    //         retainBody: collection.astro?.retainBody ?? true,
    //     }),
    //
    //     schema: (context: SchemaContext) =>
    //         sveltiaFieldsToAstroSchema(
    //             collection.fields,
    //             context,
    //             options,
    //         ),
    // });

    const defined = defineCollection({
        loader: glob({
            base: collection.folder,
            pattern,
            retainBody: collection.astro?.retainBody ?? true,
        }),

        schema: (context: SchemaContext) =>
            sveltiaFieldsToAstroSchema(collection.fields, context, options),
    });

    return defined as DefinedCmsCollection<InferCmsEntryCollection<Collection>>;
}

/* ------------------------------------------------------------------ */
/* File collections                                                   */

/* ------------------------------------------------------------------ */

export interface CmsFile<
    Fields extends readonly CmsField[] = readonly CmsField[],
> extends HasAstroOptions {
    name: string;
    file: string;
    fields: Fields;
}

export interface CmsFileCollection<
    Files extends readonly CmsFile[] = readonly CmsFile[],
> extends HasAstroOptions {
    name: string;
    files: Files;
}

type InferCmsFile<
    Collection extends CmsFileCollection,
    File extends CmsFile,
> = InferSveltiaDocument<
    File["fields"],
    EffectiveCmsSchemaOptions<Collection, File>,
    AllowsRootList<File["file"]>
>;

export type InferCmsFileCollection<
    Collection extends CmsFileCollection,
> =
    Collection["files"][number] extends infer File extends CmsFile
        ? InferCmsFile<Collection, File>
        : never;

function createFileCollectionLoader<
    const Collection extends CmsFileCollection,
>(collection: Collection): Loader {
    const filesByPath = new Map(
        collection.files.map((file) => [
            normalizePath(file.file),
            file,
        ]),
    );

    const loader = glob({
        base: ".",
        pattern: collection.files.map((file) => normalizePath(file.file)),
        retainBody: collection.astro?.retainBody ?? true,

        generateId: ({entry}) => {
            const path = normalizePath(entry);
            const file = filesByPath.get(path);

            if (!file) {
                throw new Error(
                    `No CMS file definition found for "${entry}".`,
                );
            }

            return file.name;
        },
    });

    return {
        name: `sveltia-files:${collection.name}`,

        async load(context) {
            let hasExistingFile = false;

            for (const file of collection.files) {
                const fileUrl = new URL(normalizePath(file.file), context.config.root);

                if (existsSync(fileUrl)) {
                    hasExistingFile = true;
                } else {
                    context.store.delete(file.name);
                }
            }

            if (!hasExistingFile) return;

            const wrappedContext = {
                ...context,

                parseData: async <
                    TData extends Record<string, unknown>,
                >(options: {
                    id: string;
                    data: TData;
                    filePath?: string;
                }) => {
                    const envelope = {
                        __cmsFile: options.id,
                        value: options.data,
                    };

                    const parsed = await context.parseData({
                        ...options,
                        data: envelope as never,
                    });

                    return parsed as TData;
                },
            } as typeof context;

            await loader.load(wrappedContext);
        },
    } satisfies Loader;
}

export function defineCmsFileCollection<
    const Collection extends CmsFileCollection,
>(collection: Collection): DefinedCmsCollection<InferCmsFileCollection<Collection>> {
    const defined = defineCollection({
        loader: createFileCollectionLoader(collection),

        schema: (context: SchemaContext) => {
            const variants = collection.files.map((file) => {
                const options = schemaOptions(collection, file) as EffectiveCmsSchemaOptions<Collection, typeof file>;

                return z.object({
                    __cmsFile: z.literal(file.name),

                    value: sveltiaDocumentToAstroSchema(
                        file.fields,
                        context,
                        options,
                        allowsRootList(file.file),
                    ),
                });
            });

            if (variants.length === 0) {
                throw new Error(`CMS file collection "${collection.name}" has no files.`);
            }

            const envelope =
                variants.length === 1
                    ? variants[0]
                    : z.discriminatedUnion("__cmsFile", variants as any);

            return envelope.transform(({value}) => value) as unknown as z.ZodType<InferCmsFileCollection<Collection>>;
        },
    });

    return defined as DefinedCmsCollection<InferCmsFileCollection<Collection>>;
}

/* ------------------------------------------------------------------ */
/* Singletons                                                         */

/* ------------------------------------------------------------------ */

export interface CmsSingleton<
    Fields extends readonly CmsField[] = readonly CmsField[],
> extends HasAstroOptions {
    name: string;
    file: string;
    fields: Fields;
}

function defaultEntryId(file: string): string {
    const filename = normalizePath(file).split("/").at(-1);

    if (!filename) {
        throw new Error(`Unable to derive an entry ID from "${file}".`);
    }

    return filename.replace(/\.[^.]+$/, "");
}

export function defineCmsSingleton<
    const Singleton extends CmsSingleton,
>(singleton: Singleton): DefinedCmsCollection<InferCmsSingleton<Singleton>> {
    const id = singleton.astro?.id ?? defaultEntryId(singleton.file);

    const collection = {
        name: singleton.name,
        astro: singleton.astro,

        files: [
            {
                name: id,
                file: singleton.file,
                fields: singleton.fields,
            },
        ],
    } as const;

    // return defineCmsFileCollection(collection);
    return defineCmsFileCollection(collection) as DefinedCmsCollection<InferCmsSingleton<Singleton>>;
}