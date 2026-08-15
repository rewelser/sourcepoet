import type {Field} from "@sveltia/cms";
import {z} from "astro/zod";
import {
    createAuxiliaryTypeStore,
    createTypeAlias,
    printNode,
    type TypeOverrideMap,
    zodToTs,
} from "zod-to-ts";

import {sveltiaSchema, type SveltiaSchemaContext} from "./schema";

export async function buildSourceSchema(
    fields: Field[],
    bodyFieldKey?: string,
    context: SveltiaSchemaContext = {}
) {
    const astroImageSchemas = new Set<z.ZodType>();

    const schema = sveltiaSchema(fields, bodyFieldKey, {...context, astroImageSchemas});

    const auxiliaryTypeStore = createAuxiliaryTypeStore();

    const overrides: TypeOverrideMap = new Map();

    for (const imageSchema of astroImageSchemas) {
        overrides.set(
            imageSchema,
            (ts) => ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("ImageMetadata")));
    }

    const {node} = zodToTs(schema, {auxiliaryTypeStore, unrepresentable: "any", overrides});

    const typeAlias = createTypeAlias(node, "Entry");

    const imageImport = astroImageSchemas.size > 0 ? (`import type { ImageMetadata } from "astro";\n\n`) : "";

    return {schema, types: imageImport +`export ${printNode(typeAlias)}`};
}