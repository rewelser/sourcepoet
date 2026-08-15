import type {Field} from "@sveltia/cms";
import {getWidget, isAstroReferenceRelation} from "./schema";
import {resolveAstroImage} from "./image";
import {getFieldMediaContext, isAstroResolvableMedia, type SveltiaMediaContext} from "./media";

export interface SveltiaTransformContext {
    media?: SveltiaMediaContext;
    filePath?: string;
    root?: URL;
}

type FieldRecord = Field & Record<string, unknown>;

function transformRelation(value: unknown, field: Field): unknown {
    if (!isAstroReferenceRelation(field)) {
        return value;
    }

    const collection = (field as FieldRecord).collection;

    if (typeof collection !== "string") {
        return value;
    }

    const multiple = (field as FieldRecord).multiple === true;

    if (multiple && Array.isArray(value)) {
        return value.map((item) =>
            typeof item === "string"
                ? {
                    collection,
                    id: item,
                }
                : item,
        );
    }

    if (typeof value === "string") {
        return {collection, id: value};
    }

    return value;
}

export async function transformFieldValues(data: Record<string, unknown>, fields: Field[], context: SveltiaTransformContext = {}): Promise<Record<string, unknown>> {
    const result = {...data};

    for (const field of fields) {
        if (!(field.name in result) ||
            result[field.name] == null) {
            continue;
        }

        const fieldContext: SveltiaTransformContext = {
            ...context,
            media: getFieldMediaContext(field, context.media),
        };

        const widget = getWidget(field);

        if (widget === "image") {
            result[field.name] = await transformImage(result[field.name], fieldContext);

            continue;
        }

        if (widget === "relation") {
            result[field.name] = transformRelation(result[field.name], field);

            continue;
        }

        const record = field as FieldRecord;

        if (widget === "object") {
            const value = result[field.name];

            if (typeof value !== "object" ||
                value === null ||
                Array.isArray(value)) {
                continue;
            }

            const fields = Array.isArray(record.fields) ? record.fields as Field[] : undefined;

            if (fields) {
                result[field.name] = await transformFieldValues(value as Record<string, unknown>, fields, fieldContext);

                continue;
            }

            const types = Array.isArray(record.types) ? record.types : undefined;
            const typeKey = typeof record.typeKey === "string" ? record.typeKey : "type";

            if (types) {
                const typeName = (value as Record<string, unknown>)[typeKey];

                const variant =
                    types.find((type) =>
                        typeof type === "object" &&
                        type !== null &&
                        "name" in type &&
                        type.name === typeName,
                    );

                if (variant &&
                    "fields" in variant &&
                    Array.isArray(variant.fields)) {
                    result[field.name] = await transformFieldValues(value as Record<string, unknown>, variant.fields as Field[], fieldContext);
                }
            }
        }

        if (widget === "list") {
            const value = result[field.name];

            if (!Array.isArray(value)) {
                continue;
            }

            const fields = Array.isArray(record.fields) ? record.fields as Field[] : undefined;

            if (fields) {
                result[field.name] =
                    await Promise.all(
                        value.map(async (item) =>
                                typeof item ===
                                "object" &&
                                item !== null &&
                                !Array.isArray(item)
                                    ? await transformFieldValues(item as Record<string, unknown>, fields, fieldContext)
                                    : item,
                        )
                    );
                continue;
            }

            const subfield =
                typeof record.field ===
                "object" &&
                record.field !== null
                    ? record.field as Field
                    : undefined;

            if (subfield && getWidget(subfield) === "relation") {
                result[field.name] = transformRelation(value, subfield);
            }
        }
    }

    return result;
}

async function transformImage(value: unknown, context: SveltiaTransformContext): Promise<unknown> {
    if (!context.media || !isAstroResolvableMedia(context.media)) {
        return value;
    }

    if (!context.filePath || !context.root) {
        throw new Error(
            "[sveltiaLoader] Cannot resolve an " +
            "entry-relative image without " +
            "the entry file path and Astro root.",
        );
    }

    const transformOne =
        async (item: unknown): Promise<unknown> => {
            if (typeof item !== "string") {
                return item;
            }

            return resolveAstroImage(item, context.filePath!, context.root!);
        };

    return Array.isArray(value) ? Promise.all(value.map(transformOne)) : transformOne(value);
}