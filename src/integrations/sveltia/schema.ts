import {z} from "astro/zod";
import type {Field} from "@sveltia/cms";
// import type {SchemaContext} from "astro/content/config";
import type {ImageMetadata} from "astro";
import {isESMImportedImage} from "astro/assets/utils";
import {getFieldMediaContext, isAstroResolvableMedia, type SveltiaMediaContext} from "./media.ts";

type FieldRecord = Field & Record<string, unknown>;
type VariableType = {
    name: string;
    fields?: Field[];
};

export interface SveltiaSchemaContext {
    media?: SveltiaMediaContext;
    astroImageSchemas?: Set<z.ZodType>;
}

export function isAstroReferenceRelation(field: FieldRecord): boolean {
    if (getWidget(field) !== "relation") {
        return false;
    }

    const record = field as FieldRecord;

    // A relation with `file` targets a list item
    // inside a Sveltia file collection, not an
    // Astro collection entry.
    if (typeof record.file === "string") return false;

    const valueField = record.value_field;

    return (valueField === undefined || valueField === "{{slug}}");
}

function getTypes(field: Field): VariableType[] | undefined {
    const types = (field as FieldRecord).types;

    if (!Array.isArray(types)) {
        return undefined;
    }

    return types.filter(
        (type): type is VariableType =>
            typeof type === "object" &&
            type !== null &&
            "name" in type &&
            typeof type.name === "string"
    );
}

function getTypeKey(field: Field): string {
    const typeKey = (field as FieldRecord).typeKey;

    return typeof typeKey === "string"
        ? typeKey
        : "type";
}

export function getWidget(
    field: Field,
): string {
    return (
        "widget" in field &&
        typeof field.widget === "string"
    )
        ? field.widget
        : "string";
}

function getBooleanOption(
    field: Field,
    key: string,
): boolean {
    const value = (field as FieldRecord)[key];
    return value === true;
}

function isOptionalField(
    field: Field,
): boolean {
    return (
        "required" in field &&
        field.required === false
    );
}

function isBodyField(
    field: Field,
    bodyFieldKey?: string,
): boolean {
    if (
        !bodyFieldKey ||
        field.name !== bodyFieldKey
    ) {
        return false;
    }

    const widget =
        getWidget(field);

    return (
        widget === "markdown" ||
        widget === "richtext"
    );
}

export function fieldToZod(field: Field, context: SveltiaSchemaContext = {}): z.ZodType {
    switch (getWidget(field)) {
        case "string":
            return stringSchema(field);

        case "text":
        case "markdown":
        case "richtext":
        case "color":
        case "map":
        case "uuid":
            return z.string();

        case "compute":
            return computeSchema(field);

        case "number":
            return numberSchema(field);

        case "boolean":
            return z.boolean();

        case "datetime":
            return z.string();

        case "keyvalue":
            return keyValueSchema(field);

        case "select":
            return selectSchema(field);

        case "file":
            return fileSchema(field);

        case "image":
            return imageSchema(field, context);

        case "code":
            return codeSchema(field);

        case "hidden":
            return z.unknown();

        case "relation":
            return relationSchema(field);

        case "object":
            return objectSchema(field, context);

        case "list":
            return listSchema(field, context);

        default:
            return z.any();
    }
}

export function sveltiaSchema(
    fields: Field[],
    bodyFieldKey?: string,
    context: SveltiaSchemaContext = {},
): z.ZodObject<Record<string, z.ZodType>> {
    return z.object(fieldsToShape(fields, bodyFieldKey, context));
}

function fileSchema(field: Field): z.ZodType {
    const schema = z.string();
    return getBooleanOption(field, "multiple") ? z.array(schema) : schema;
}

function codeSchema(field: Field): z.ZodType {
    if (getBooleanOption(field, "output_code_only")) {
        return z.string();
    }

    const keys = (field as FieldRecord).keys;
    const codeKey = typeof keys === "object" &&
    keys !== null &&
    "code" in keys &&
    typeof keys.code === "string"
        ? keys.code
        : "code";

    const langKey = typeof keys === "object" &&
    keys !== null &&
    "lang" in keys &&
    typeof keys.lang === "string"
        ? keys.lang
        : "lang";

    return z.object({
        [codeKey]: z.string(),
        [langKey]: z.string(),
    })
}

function selectSchema(field: Field): z.ZodType {
    const multiple = getBooleanOption(field, "multiple");
    const options = (field as FieldRecord).options;

    if (!Array.isArray(options)) {
        return multiple
            ? z.array(
                z.union([
                    z.string(),
                    z.number(),
                ]),
            ) : z.union([
                z.string(),
                z.number(),
            ]);
    }

    const values = options.map((option) => {
        if (
            typeof option === "string" ||
            typeof option === "number"
        ) {
            return option;
        }

        if (typeof option === "object" &&
            option !== null &&
            "value" in option &&
            (typeof option.value === "string" || typeof option.value === "number")) {
            return option.value;
        }

        return undefined;
    })
        .filter((value): value is string | number => value !== undefined);

    if (values.length === 0) {
        return multiple
            ? z.array(
                z.union([
                    z.string(),
                    z.number(),
                ])
            ) : z.union([
                z.string(),
                z.number(),
            ])
    }

    const literals = values.map((value) => z.literal(value));

    const valueSchema = literals.length === 1
        ? literals[0]
        : z.union(
            literals as [
                z.ZodLiteral<string | number>,
                z.ZodLiteral<string | number>,
                ...z.ZodLiteral<string | number>[],
            ],
        );

    return multiple ? z.array(valueSchema) : valueSchema;
}

function getFields(field: Field): Field[] | undefined {
    const fields = (field as FieldRecord).fields;
    return Array.isArray(fields) ? fields as Field[] : undefined;
}

// function fieldsToShape(fields: Field[], excludeBody = false): Record<string, z.ZodType> {
//     const shape: Record<string, z.ZodType> = {};
//     for (const field of fields) {
//         if (excludeBody && isBodyField(field)) {
//             continue;
//         }
//
//         let schema = fieldToZod(field);
//
//         if (isOptionalField(field)) {
//             const widget =
//                 getWidget(field);
//
//             const nullable =
//                 widget === "object" ||
//                 widget === "number" ||
//                 (
//                     widget === "relation" &&
//                     !getBooleanOption(
//                         field,
//                         "multiple",
//                     )
//                 ) ||
//                 (
//                     widget === "select" &&
//                     !getBooleanOption(
//                         field,
//                         "multiple",
//                     )
//                 );
//
//             schema =
//                 nullable
//                     ? schema
//                         .nullable()
//                         .optional()
//                     : schema.optional();
//         }
//
//         shape[field.name] = schema;
//     }
//     return shape;
// }

function fieldsToShape(
    fields: Field[],
    bodyFieldKey?: string,
    context: SveltiaSchemaContext = {}
): Record<string, z.ZodType> {
    const shape:
        Record<string, z.ZodType> = {};

    for (const field of fields) {
        if (
            isBodyField(field, bodyFieldKey)
        ) {
            continue;
        }

        let schema = fieldToZod(field, context);

        if (isOptionalField(field)) {
            const widget = getWidget(field);

            const nullable =
                widget === "object" ||
                widget === "number" ||
                (
                    widget === "relation" &&
                    !getBooleanOption(
                        field,
                        "multiple",
                    )
                ) ||
                (
                    widget === "select" &&
                    !getBooleanOption(
                        field,
                        "multiple",
                    )
                );

            schema =
                nullable
                    ? schema
                        .nullable()
                        .optional()
                    : schema.optional();
        }

        shape[field.name] =
            schema;
    }

    return shape;
}

function objectSchema(field: Field, context: SveltiaSchemaContext): z.ZodType {
    const types = getTypes(field);

    if (types) return variableTypeSchema(field, context);

    const fields = getFields(field);

    if (!fields) {
        return z.any();
    }

    return z.object(fieldsToShape(fields, undefined, context));
}

function getField(field: Field): Field | undefined {
    const subfield = (field as FieldRecord).field;

    return (typeof subfield === "object" && subfield !== null) ? subfield as Field : undefined;
}

function getNumberOption(field: Field, key: string): number | undefined {
    const value = (field as FieldRecord)[key];
    return typeof value === "number" ? value : undefined;
}

function getStringOption(
    field: Field,
    key: string,
): string | undefined {
    const value =
        (field as FieldRecord)[key];

    return typeof value === "string"
        ? value
        : undefined;
}

function listSchema(field: Field, context: SveltiaSchemaContext): z.ZodType {
    const subfield = getField(field);
    const fields = getFields(field);
    const types = (field as FieldRecord).types;

    let itemSchema: z.ZodType;

    if (Array.isArray(types)) {
        itemSchema = variableTypeSchema(field, context);
    } else if (subfield) {
        itemSchema = fieldToZod(subfield, context);
    } else if (fields) {
        itemSchema = z.object(fieldsToShape(fields, undefined, context));
    } else {
        itemSchema = z.string();
    }

    let schema = z.array(itemSchema);
    const min = getNumberOption(field, "min");
    const max = getNumberOption(field, "max");

    if (min !== undefined) {
        schema = schema.min(min);
    }

    if (max !== undefined) {
        schema = schema.max(max);
    }

    return schema;
}

function variableTypeSchema(field: Field, context: SveltiaSchemaContext): z.ZodType {
    const types = getTypes(field);

    if (!types || types.length === 0) return z.any();

    const typeKey = getTypeKey(field);

    const schemas = types.map((type) => {
        const fields = type.fields ?? [];

        return z.object({
            [typeKey]: z.literal(type.name),
            ...fieldsToShape(fields, undefined, context),
        });
    });

    if (schemas.length === 1) {
        return schemas[0];
    }

    const [first, second, ...rest] = schemas;

    if (!first || !second) return z.any();

    return z.discriminatedUnion(typeKey, [first, second, ...rest]);
}

function relationSchema(field: Field): z.ZodType {
    const record = field as FieldRecord;

    const multiple = record.multiple === true;

    let valueSchema: z.ZodType;

    if (isAstroReferenceRelation(field)) {
        const collection = record.collection;

        if (typeof collection !== "string") return z.any();

        valueSchema = z.object({
            collection: z.literal(collection),
            id: z.string(),
        });
    } else {
        // Sveltia permits strings or numbers when
        // value_field points at arbitrary content.
        valueSchema = z.union([
            z.string(),
            z.number(),
        ]);
    }

    return multiple ? z.array(valueSchema) : valueSchema;
}

function stringSchema(
    field: Field,
): z.ZodType {
    let schema =
        z.string();

    const minlength =
        getNumberOption(
            field,
            "minlength",
        );

    const maxlength =
        getNumberOption(
            field,
            "maxlength",
        );

    if (minlength !== undefined) {
        schema =
            schema.min(minlength);
    } else if (!isOptionalField(field)) {
        schema =
            schema.min(1);
    }

    if (maxlength !== undefined) {
        schema =
            schema.max(maxlength);
    }

    const type =
        getStringOption(
            field,
            "type",
        );

    if (type === "email") {
        schema =
            schema.email();
    }

    if (type === "url") {
        schema =
            schema.url();
    }

    return schema;
}

function numberStringSchema(
    field: Field,
    integer: boolean,
): z.ZodType {
    const min =
        getNumberOption(
            field,
            "min",
        );

    const max =
        getNumberOption(
            field,
            "max",
        );

    return z.string().refine(
        (value) => {
            if (value.trim() === "") {
                return false;
            }

            const number =
                Number(value);

            if (!Number.isFinite(number)) {
                return false;
            }

            if (
                integer &&
                !Number.isInteger(number)
            ) {
                return false;
            }

            if (
                min !== undefined &&
                number < min
            ) {
                return false;
            }

            if (
                max !== undefined &&
                number > max
            ) {
                return false;
            }

            return true;
        },
        {
            message:
                "Invalid numeric value.",
        },
    );
}

function numberSchema(
    field: Field,
): z.ZodType {
    const valueType =
        getStringOption(
            field,
            "value_type",
        ) ?? "int";

    if (valueType === "int/string") {
        return numberStringSchema(
            field,
            true,
        );
    }

    if (valueType === "float/string") {
        return numberStringSchema(
            field,
            false,
        );
    }

    let schema =
        valueType === "float"
            ? z.number()
            : z.number().int();

    const min =
        getNumberOption(
            field,
            "min",
        );

    const max =
        getNumberOption(
            field,
            "max",
        );

    if (min !== undefined) {
        schema =
            schema.min(min);
    }

    if (max !== undefined) {
        schema =
            schema.max(max);
    }

    return schema;
}

function computeSchema(
    field: Field,
): z.ZodType {
    const value =
        getStringOption(
            field,
            "value",
        );

    if (
        value?.trim() === "{{index}}"
    ) {
        return z.number();
    }

    return z.string();
}

function keyValueSchema(
    field: Field,
): z.ZodType {
    const min =
        getNumberOption(
            field,
            "min",
        );

    const max =
        getNumberOption(
            field,
            "max",
        );

    return z
        .record(
            z.string(),
            z.string(),
        )
        .refine(
            (value) => {
                const count =
                    Object.keys(value).length;

                if (
                    min !== undefined &&
                    count < min
                ) {
                    return false;
                }

                if (
                    max !== undefined &&
                    count > max
                ) {
                    return false;
                }

                return true;
            },
            {
                message:
                    "Invalid number of key-value pairs.",
            },
        );
}

function imageSchema(field: Field, context: SveltiaSchemaContext): z.ZodType {
    const media = getFieldMediaContext(field, context.media);

    let itemSchema: z.ZodType;

    if (isAstroResolvableMedia(media)) {
        itemSchema =
            z.custom<ImageMetadata>(
                (value) => isESMImportedImage(value as Parameters<typeof isESMImportedImage>[0]),
                {message: "Expected an Astro imported image."},
            );

        context.astroImageSchemas?.add(itemSchema);
    } else {
        itemSchema = z.string();
    }

    if (!getBooleanOption(field, "multiple")) {
        return itemSchema;
    }

    let schema = z.array(itemSchema);

    const min = getNumberOption(field, "min");
    const max = getNumberOption(field, "max");

    if (min !== undefined) {
        schema = schema.min(min);
    }

    if (max !== undefined) {
        schema = schema.max(max);
    }

    return schema;
}