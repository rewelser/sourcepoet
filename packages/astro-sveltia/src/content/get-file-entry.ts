import type {CmsConfig} from "@sveltia/cms";
import {getEntry, type CollectionEntry, type CollectionKey} from "astro:content";

import {
    getCmsFile,
    type CmsFileName,
    type CollectionByName,
    type FileByName,
    type FileCollectionName,
} from "./query-config.ts";

import {
    type CmsField,
    type EffectiveCmsSchemaOptions,
    type InferSveltiaDocument,
} from "./schema-types.ts";

type SelectedCollection<
    Config extends CmsConfig,
    CollectionName extends FileCollectionName<Config>,
> = CollectionByName<Config, CollectionName>;

type SelectedFile<
    Config extends CmsConfig,
    CollectionName extends FileCollectionName<Config>,
    FileName extends CmsFileName<SelectedCollection<Config, CollectionName>>,
> = FileByName<SelectedCollection<Config, CollectionName>, FileName>;

type AllowsRootList<Path extends string> =
    Lowercase<Path> extends `${string}.toml` ? false : true;

type InferFileData<
    Config extends CmsConfig,
    CollectionName extends FileCollectionName<Config>,
    FileName extends CmsFileName<SelectedCollection<Config, CollectionName>>,
> =
    SelectedFile<Config, CollectionName, FileName> extends {
            fields: infer Fields extends readonly CmsField[];
            file: infer Path extends string;
        }
        ? InferSveltiaDocument<
            Fields,
            EffectiveCmsSchemaOptions<
                SelectedCollection<Config, CollectionName>,
                SelectedFile<Config, CollectionName, FileName>
            >,
            AllowsRootList<Path>
        >
        : never;

type ExactCmsFileEntry<
    CollectionName extends CollectionKey,
    FileName extends string,
    Data,
> = Omit<CollectionEntry<CollectionName>, "id" | "data"> & {
    id: FileName;
    data: Data;
};

export async function getCmsFileEntry<
    const Config extends CmsConfig,
    const CollectionName extends FileCollectionName<Config> & CollectionKey,
    const FileName extends CmsFileName<SelectedCollection<Config, CollectionName>>,
>(
    config: Config,
    collectionName: CollectionName,
    fileName: FileName,
): Promise<
    | ExactCmsFileEntry<
    CollectionName,
    FileName,
    InferFileData<Config, CollectionName, FileName>
>
    | undefined
> {
    getCmsFile(config, collectionName, fileName);

    const entry = await getEntry(collectionName, fileName);

    return entry as
        | ExactCmsFileEntry<
        CollectionName,
        FileName,
        InferFileData<Config, CollectionName, FileName>
    >
        | undefined;
}