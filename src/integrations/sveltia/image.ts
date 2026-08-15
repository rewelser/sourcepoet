import {dirname, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import type {ImageMetadata} from "astro";
import {resolveSrc} from "astro/assets/utils";
import {resolveSveltiaImage} from "virtual:sourcepoet-sveltia/images";

function toViteImagePath(value: string, filePath: string, root: URL): string {
    const absolutePath = resolve(dirname(filePath), value);
    const rootPath = fileURLToPath(root);
    const relativePath = relative(rootPath, absolutePath);

    if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
        throw new Error(
            `[sveltiaLoader] Image "${value}" ` +
            `resolves outside the Astro project root.`,
        );
    }

    return (
        "/" +
        relativePath
            .split(sep)
            .join("/")
    );
}

export async function resolveAstroImage(value: string, filePath: string, root: URL): Promise<ImageMetadata> {
    const path = toViteImagePath(value, filePath, root);

    const resolved = await resolveSrc(resolveSveltiaImage(path),);

    if (typeof resolved === "string") {
        throw new Error(
            `[sveltiaLoader] Image "${value}" ` +
            `resolved to a string instead of ` +
            `Astro ImageMetadata.`,
        );
    }

    return resolved;
}