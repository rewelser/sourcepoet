import type {CmsConfig, Field} from "@sveltia/cms";
import type {ResolvedSveltiaSource} from "./config";

type MediaOwner = Record<string, unknown>;

export interface SveltiaMediaContext {
    mediaFolder?: string;
    publicFolder?: string;

    mediaIsEntryRelative: boolean;
    publicIsEntryRelative: boolean;
}

function getStringProperty(value: unknown, key: string): string | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }

    const property = (value as MediaOwner)[key];

    return typeof property === "string" ? property : undefined;
}

function isEntryRelativePath(path: string): boolean {
    return !path.startsWith("/");
}

function getTopLevelMediaContext(config: CmsConfig): SveltiaMediaContext {
    const mediaFolder = getStringProperty(config, "media_folder");
    const publicFolder = getStringProperty(config, "public_folder") ?? mediaFolder;

    return {
        mediaFolder,
        publicFolder,

        // Top-level media paths are repository-root
        // paths in Sveltia, even if the leading slash
        // was omitted.
        mediaIsEntryRelative: false,
        publicIsEntryRelative: false,
    };
}

function applyMediaScope(parent: SveltiaMediaContext, owner: unknown): SveltiaMediaContext {
    const mediaFolder = getStringProperty(owner, "media_folder");
    const publicFolder = getStringProperty(owner, "public_folder");

    const next = {...parent};

    if (mediaFolder !== undefined) {
        next.mediaFolder = mediaFolder;
        next.mediaIsEntryRelative = isEntryRelativePath(mediaFolder);

        // At collection/file/field scope,
        // public_folder defaults to media_folder.
        if (publicFolder === undefined) {
            next.publicFolder = mediaFolder;
            next.publicIsEntryRelative = next.mediaIsEntryRelative;
        }
    }

    if (publicFolder !== undefined) {
        next.publicFolder = publicFolder;
        next.publicIsEntryRelative = isEntryRelativePath(publicFolder);
    }

    return next;
}

export function getSourceMediaContext(config: CmsConfig, source: ResolvedSveltiaSource): SveltiaMediaContext {
    let context = getTopLevelMediaContext(config);

    switch (source.kind) {
        case "folder":
            return applyMediaScope(context, source.collection);

        case "file":
            context = applyMediaScope(context, source.collection);
            return applyMediaScope(context, source.file);

        case "singleton":
            return applyMediaScope(context, source.singleton);
    }
}

export function getFieldMediaContext(
    field: Field,
    parent:
        | SveltiaMediaContext
        | undefined,
): SveltiaMediaContext {
    return applyMediaScope(
        parent ?? {
            mediaIsEntryRelative: false,
            publicIsEntryRelative: false,
        },
        field,
    );
}

export function isAstroResolvableMedia(context: SveltiaMediaContext): boolean {
    return (
        context.mediaFolder !== undefined &&
        context.publicFolder !== undefined &&
        context.mediaIsEntryRelative &&
        context.publicIsEntryRelative
    );
}