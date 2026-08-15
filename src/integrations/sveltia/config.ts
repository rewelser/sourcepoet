import { readFileSync } from "node:fs";
// import type { CmsConfig } from "@sveltia/cms";
import type {
    CmsConfig,
    Field,
} from "@sveltia/cms";

const CONFIG_PATH =
    ".astro/integrations/sourcepoet-sveltia/config.json";

type UnknownRecord =
    Record<string, unknown>;

export type FolderCollection = UnknownRecord & {
    name: string;
    folder: string;
    fields: Field[];
    extension?: string;
};

export type FileCollectionItem = UnknownRecord & {
    name: string;
    file: string;
    fields: Field[];
};

export type FileCollection = UnknownRecord & {
    name: string;
    files: FileCollectionItem[];
};

export type Singleton = UnknownRecord & {
    name: string;
    file: string;
    fields: Field[];
};

export type SveltiaSourceSelector =
    | string
    | {
    collection: string;
    file: string;
}
    | {
    singleton: string;
};

export type ResolvedSveltiaSource =
    | {
    kind: "folder";
    collection: FolderCollection;
}
    | {
    kind: "file";
    collection: FileCollection;
    file: FileCollectionItem;
}
    | {
    kind: "singleton";
    singleton: Singleton;
};

function isRecord(
    value: unknown,
): value is UnknownRecord {
    return (
        typeof value === "object" &&
        value !== null
    );
}

function hasName(
    value: unknown,
): value is UnknownRecord & { name: string } {
    return (
        isRecord(value) &&
        typeof value.name === "string"
    );
}

function isFolderCollection(
    value: unknown,
): value is FolderCollection {
    return (
        hasName(value) &&
        typeof value.folder === "string" &&
        Array.isArray(value.fields)
    );
}

function isFileCollectionItem(
    value: unknown,
): value is FileCollectionItem {
    return (
        hasName(value) &&
        typeof value.file === "string" &&
        Array.isArray(value.fields)
    );
}

function isFileCollection(
    value: unknown,
): value is FileCollection {
    return (
        hasName(value) &&
        Array.isArray(value.files) &&
        value.files.every(
            isFileCollectionItem,
        )
    );
}

function isSingleton(
    value: unknown,
): value is Singleton {
    return isFileCollectionItem(value);
}

export function readCmsConfig(): CmsConfig {
    const configPath =
        `${process.cwd()}/${CONFIG_PATH}`;

    try {
        const raw =
            readFileSync(configPath, "utf-8");

        const parsed: unknown =
            JSON.parse(raw);

        if (!isRecord(parsed)) {
            throw new Error(
                `[sveltiaLoader] CMS config at ` +
                `${configPath} is not a valid object.`,
            );
        }

        return parsed as CmsConfig;
    } catch (error) {
        if (
            error instanceof Error &&
            error.message.startsWith(
                "[sveltiaLoader]",
            )
        ) {
            throw error;
        }

        throw new Error(
            `[sveltiaLoader] Could not read CMS config ` +
            `from ${configPath}. Make sure the ` +
            `Sveltia integration is registered in ` +
            `astro.config.mjs.`,
        );
    }
}

export function resolveSveltiaSource(
    config: CmsConfig,
    selector: SveltiaSourceSelector,
): ResolvedSveltiaSource {
    if (typeof selector === "string") {
        return resolveFolderCollection(
            config,
            selector,
        );
    }

    if ("singleton" in selector) {
        return resolveSingleton(
            config,
            selector.singleton,
        );
    }

    return resolveFileCollectionItem(
        config,
        selector.collection,
        selector.file,
    );
}

function resolveFolderCollection(
    config: CmsConfig,
    name: string,
): ResolvedSveltiaSource {
    const collections =
        config.collections ?? [];

    const match =
        collections.find(
            (collection) =>
                hasName(collection) &&
                collection.name === name,
        );

    if (!match) {
        throw new Error(
            `[sveltiaLoader] Collection "${name}" ` +
            `was not found.`,
        );
    }

    if (isFolderCollection(match)) {
        return {
            kind: "folder",
            collection: match,
        };
    }

    if (isFileCollection(match)) {
        throw new Error(
            `[sveltiaLoader] Collection "${name}" ` +
            `is a file collection. Select a file with ` +
            `{ collection: "${name}", file: "..." }.`,
        );
    }

    throw new Error(
        `[sveltiaLoader] Collection "${name}" has an ` +
        `unsupported configuration shape.`,
    );
}

function resolveFileCollectionItem(
    config: CmsConfig,
    collectionName: string,
    fileName: string,
): ResolvedSveltiaSource {
    const collections =
        config.collections ?? [];

    const match =
        collections.find(
            (collection) =>
                hasName(collection) &&
                collection.name === collectionName,
        );

    if (!match) {
        throw new Error(
            `[sveltiaLoader] Collection ` +
            `"${collectionName}" was not found.`,
        );
    }

    if (!isFileCollection(match)) {
        throw new Error(
            `[sveltiaLoader] Collection ` +
            `"${collectionName}" is not a file collection.`,
        );
    }

    const file =
        match.files.find(
            (item) => item.name === fileName,
        );

    if (!file) {
        const available =
            match.files
                .map((item) => item.name)
                .join(", ");

        throw new Error(
            `[sveltiaLoader] File "${fileName}" was not ` +
            `found in collection "${collectionName}". ` +
            `Available files: ${available || "(none)"}.`,
        );
    }

    return {
        kind: "file",
        collection: match,
        file,
    };
}

function resolveSingleton(
    config: CmsConfig,
    name: string,
): ResolvedSveltiaSource {
    const value =
        (config as CmsConfig & {
            singletons?: unknown[];
        }).singletons;

    const singletons =
        Array.isArray(value)
            ? value
            : [];

    const match =
        singletons.find(
            (singleton) =>
                hasName(singleton) &&
                singleton.name === name,
        );

    if (!match) {
        throw new Error(
            `[sveltiaLoader] Singleton "${name}" ` +
            `was not found.`,
        );
    }

    if (!isSingleton(match)) {
        throw new Error(
            `[sveltiaLoader] Singleton "${name}" has an ` +
            `unsupported configuration shape.`,
        );
    }

    return {
        kind: "singleton",
        singleton: match,
    };
}