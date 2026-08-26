import type { CmsConfig } from "@sveltia/cms";

type CmsCollection<Config extends CmsConfig> =
    NonNullable<Config["collections"]>[number];

export type CollectionName<Config extends CmsConfig> =
    CmsCollection<Config> extends infer Collection
        ? Collection extends { name: infer Name extends string }
            ? Name
            : never
        : never;

export type CollectionByName<
    Config extends CmsConfig,
    Name extends CollectionName<Config>,
> = Extract<CmsCollection<Config>, { name: Name }>;

type FileCollection<Config extends CmsConfig> =
    CmsCollection<Config> extends infer Collection
        ? Collection extends { files: readonly unknown[] }
            ? Collection
            : never
        : never;

export type FileCollectionName<Config extends CmsConfig> =
    FileCollection<Config> extends infer Collection
        ? Collection extends { name: infer Name extends string }
            ? Name
            : never
        : never;

type CmsFile<Collection> =
    Collection extends { files: readonly (infer File)[] }
        ? File
        : never;

export type CmsFileName<Collection> =
    CmsFile<Collection> extends infer File
        ? File extends { name: infer Name extends string }
            ? Name
            : never
        : never;

export type FileByName<
    Collection,
    Name extends CmsFileName<Collection>,
> = Extract<CmsFile<Collection>, { name: Name }>;

type CmsSingleton<Config extends CmsConfig> =
    NonNullable<Config["singletons"]>[number];

type SingletonName<Config extends CmsConfig> =
    CmsSingleton<Config> extends infer Singleton
        ? Singleton extends { name: infer Name extends string }
            ? Name
            : never
        : never;

type SingletonByName<
    Config extends CmsConfig,
    Name extends SingletonName<Config>,
> = Extract<CmsSingleton<Config>, { name: Name }>;

export function getCmsCollection<
    const Config extends CmsConfig,
    const Name extends CollectionName<Config>,
>(config: Config, name: Name): CollectionByName<Config, Name> {
    const collection = config.collections?.find(
        (collection) => collection.name === name,
    );

    if (!collection) {
        throw new Error(`CMS collection "${name}" was not found.`);
    }

    return collection as unknown as CollectionByName<Config, Name>;
}

export function getCmsFile<
    const Config extends CmsConfig,
    const CollectionName extends FileCollectionName<Config>,
    const FileName extends CmsFileName<CollectionByName<Config, CollectionName>>,
>(
    config: Config,
    collectionName: CollectionName,
    fileName: FileName,
): FileByName<CollectionByName<Config, CollectionName>, FileName> {
    const collection = getCmsCollection(config, collectionName);

    if (!("files" in collection) || !Array.isArray(collection.files)) {
        throw new Error(`CMS collection "${collectionName}" is not a file collection.`);
    }

    const files = collection.files as readonly { name?: string }[];
    const file = files.find((file) => file.name === fileName);

    if (!file) {
        throw new Error(
            `CMS file "${fileName}" was not found in collection "${collectionName}".`,
        );
    }

    return file as unknown as FileByName<
        CollectionByName<Config, CollectionName>,
        FileName
    >;
}

export function getCmsSingleton<
    const Config extends CmsConfig,
    const Name extends SingletonName<Config>,
>(config: Config, name: Name): SingletonByName<Config, Name> {
    const singleton = config.singletons?.find(
        (singleton) => singleton.name === name,
    );

    if (!singleton) {
        throw new Error(`CMS singleton "${name}" was not found.`);
    }

    return singleton as unknown as SingletonByName<Config, Name>;
}