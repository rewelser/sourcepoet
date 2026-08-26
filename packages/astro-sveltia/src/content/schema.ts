import { reference, type CollectionKey, type SchemaContext } from "astro:content";
import { z } from "astro/zod";

import {
    type CmsDateTimeMode,
    type CmsField,
    type CmsImageMode,
    type CmsRelationMode,
    type CmsSchemaOptions,
    type CmsVariableType,
    type InferSveltiaDocument,
    type InferSveltiaField,
    type InferSveltiaFields,
} from "./schema-types";

export function sveltiaFieldsToAstroSchema<
    const Fields extends readonly CmsField[],
    const Options extends CmsSchemaOptions = {},
>(
    fields: Fields,
    context: SchemaContext,
    options: Options = {} as Options,
): z.ZodType<InferSveltiaFields<Fields, Options>> {
    const shape: Record<string, z.ZodType> = {};

    for (const field of fields) {
        if (isDocumentBody(field, options)) continue;
        shape[field.name] = fieldToSchema(field, context, options, field.name);
    }

    return z.object(shape) as unknown as z.ZodType<
        InferSveltiaFields<Fields, Options>
    >;
}

export function sveltiaDocumentToAstroSchema<
    const Fields extends readonly CmsField[],
    const Options extends CmsSchemaOptions = {},
    const AllowRootList extends boolean = true,
>(
    fields: Fields,
    context: SchemaContext,
    options: Options = {} as Options,
    allowRootList: AllowRootList = true as AllowRootList,
): z.ZodType<InferSveltiaDocument<Fields, Options, AllowRootList>> {
    const rootField = getRootField(fields, allowRootList);

    if (rootField) {
        return sveltiaFieldToAstroSchema(
            rootField,
            context,
            options,
        ) as z.ZodType<InferSveltiaDocument<Fields, Options, AllowRootList>>;
    }

    return sveltiaFieldsToAstroSchema(
        fields,
        context,
        options,
    ) as z.ZodType<InferSveltiaDocument<Fields, Options, AllowRootList>>;
}

export function sveltiaFieldToAstroSchema<
    const Field extends CmsField,
    const Options extends CmsSchemaOptions = {},
>(
    field: Field,
    context: SchemaContext,
    options: Options = {} as Options,
): z.ZodType<InferSveltiaField<Field, Options>> {
    return fieldToSchema(
        field,
        context,
        options,
        field.name,
    ) as z.ZodType<InferSveltiaField<Field, Options>>;
}

function fieldToSchema(
    field: CmsField,
    context: SchemaContext,
    options: CmsSchemaOptions,
    path: string,
): z.ZodType {
    const widget = field.widget ?? "string";
    let schema: z.ZodType;

    switch (widget) {
        case "string":
            schema = translateString(field);
            break;

        case "text":
        case "markdown":
        case "richtext":
            schema = translateText(field);
            break;

        case "boolean":
            schema = z.boolean();
            break;

        case "number":
            schema = translateNumber(field);
            break;

        case "datetime":
            schema = translateDateTime(field, options);
            break;

        case "file":
            schema = translateFile(field);
            break;

        case "image":
            schema = translateImage(field, context, options);
            break;

        case "select":
            schema = translateSelect(field);
            break;

        case "relation":
            schema = translateRelation(field, options);
            break;

        case "object":
            schema = translateObject(field, context, options, path);
            break;

        case "list":
            schema = translateList(field, context, options, path);
            break;

        case "keyvalue":
            schema = translateKeyValue(field);
            break;

        case "code":
            schema = translateCode(field);
            break;

        case "compute":
            schema = translateCompute(field);
            break;

        case "hidden":
            schema = translateHidden(field);
            break;

        case "color":
            schema = translateColor(field);
            break;

        case "map":
            schema = translateMap(field);
            break;

        case "uuid":
            schema = translateUuid(field);
            break;

        default:
            schema = translateUnknown(widget, options, path);
    }

    return isRequired(field) ? schema : schema.optional();
}

/* ------------------------------------------------------------------ */
/* Strings / primitives                                               */
/* ------------------------------------------------------------------ */

function translateString(field: CmsField): z.ZodType {
    let schema =
        field.type === "email" && !field.prefix && !field.suffix
            ? z.email()
            : field.type === "url" && !field.prefix && !field.suffix
                ? z.url()
                : z.string();

    const minimum = field.minlength ?? (isRequired(field) ? 1 : undefined);

    if (minimum !== undefined) schema = schema.min(minimum);
    if (field.maxlength !== undefined) schema = schema.max(field.maxlength);

    return applyPattern(schema, field.pattern);
}

function translateText(field: CmsField): z.ZodType {
    let schema = z.string();
    const minimum = field.minlength ?? (isRequired(field) ? 1 : undefined);

    if (minimum !== undefined) schema = schema.min(minimum);
    if (field.maxlength !== undefined) schema = schema.max(field.maxlength);

    return applyPattern(schema, field.pattern);
}

function translateNumber(field: CmsField): z.ZodType {
    const valueType = field.value_type ?? "int";

    if (valueType === "int/string" || valueType === "float/string") {
        const integer = valueType === "int/string";

        return z.string().refine((value) => {
            const number = Number(value);

            if (!Number.isFinite(number)) return false;
            if (integer && !Number.isInteger(number)) return false;
            if (field.min !== undefined && number < field.min) return false;
            if (field.max !== undefined && number > field.max) return false;

            return true;
        }, { error: "Invalid numeric value" });
    }

    let schema = z.number();

    if (valueType === "int") schema = schema.int();
    if (field.min !== undefined) schema = schema.min(field.min);
    if (field.max !== undefined) schema = schema.max(field.max);

    return schema;
}

function translateDateTime(field: CmsField, options: CmsSchemaOptions): z.ZodType {
    const mode = effectiveDateTimeMode(field, options);
    return mode === "date" ? z.coerce.date() : z.string();
}

/* ------------------------------------------------------------------ */
/* Files / images                                                     */
/* ------------------------------------------------------------------ */

function translateFile(field: CmsField): z.ZodType {
    const item = applyPattern(z.string().min(1), field.pattern);
    return field.multiple ? arrayWithLimits(item, field) : item;
}

function translateImage(
    field: CmsField,
    context: SchemaContext,
    options: CmsSchemaOptions,
): z.ZodType {
    const mode = effectiveImageMode(field, options);
    const item = mode === "local" ? context.image() : z.string().min(1);

    return field.multiple ? arrayWithLimits(item, field) : item;
}

/* ------------------------------------------------------------------ */
/* Select / relation                                                  */
/* ------------------------------------------------------------------ */

function translateSelect(field: CmsField): z.ZodType {
    const values = (field.options ?? []).map((option) =>
        typeof option === "object" ? option.value : option,
    );

    if (values.length === 0) {
        throw new Error(`Select field "${field.name}" has no options.`);
    }

    const item = literalUnion(values);
    return field.multiple ? arrayWithLimits(item, field) : item;
}

function translateRelation(field: CmsField, options: CmsSchemaOptions): z.ZodType {
    const target = getReferenceTarget(field);

    let item: z.ZodType;

    if (target) {
        item = reference(target as CollectionKey);
    } else {
        const mode = effectiveRelationMode(options);

        item =
            mode === "string"
                ? z.string()
                : mode === "number"
                    ? z.number()
                    : z.union([z.string(), z.number()]);
    }

    return field.multiple ? arrayWithLimits(item, field) : item;
}

function getReferenceTarget(field: CmsField): string | undefined {
    const explicit = field.astro?.reference;

    if (explicit === false) return undefined;
    if (typeof explicit === "string") return explicit;
    if (explicit === true) return field.collection;

    if (!field.collection || field.file) return undefined;
    if (field.value_field !== undefined && field.value_field !== "{{slug}}") return undefined;

    return field.collection;
}

/* ------------------------------------------------------------------ */
/* Objects / lists                                                    */
/* ------------------------------------------------------------------ */

function translateObject(
    field: CmsField,
    context: SchemaContext,
    options: CmsSchemaOptions,
    path: string,
): z.ZodType {
    if (field.fields) {
        return nestedFieldsToSchema(field.fields, context, options, path);
    }

    if (field.types) {
        return variableTypeSchema(
            field.types,
            field.typeKey ?? "type",
            context,
            options,
            path,
        );
    }

    throw new Error(`Object field "${path}" must define fields or types.`);
}

function translateList(
    field: CmsField,
    context: SchemaContext,
    options: CmsSchemaOptions,
    path: string,
): z.ZodType {
    let item: z.ZodType;

    if (field.field) {
        item = fieldToSchema(field.field, context, options, `${path}[]`);
    } else if (field.fields) {
        item = nestedFieldsToSchema(field.fields, context, options, `${path}[]`);
    } else if (field.types) {
        item = variableTypeSchema(
            field.types,
            field.typeKey ?? "type",
            context,
            options,
            `${path}[]`,
        );
    } else {
        item = z.string();
    }

    return arrayWithLimits(item, field);
}

function nestedFieldsToSchema(
    fields: readonly CmsField[],
    context: SchemaContext,
    options: CmsSchemaOptions,
    parentPath: string,
): z.ZodType {
    const shape: Record<string, z.ZodType> = {};

    for (const field of fields) {
        const path = `${parentPath}.${field.name}`;
        shape[field.name] = fieldToSchema(field, context, options, path);
    }

    return z.object(shape);
}

function variableTypeSchema(
    types: readonly CmsVariableType[],
    typeKey: string,
    context: SchemaContext,
    options: CmsSchemaOptions,
    path: string,
): z.ZodType {
    if (types.length === 0) {
        throw new Error(`Variable-type field "${path}" has no types.`);
    }

    const variants = types.map((type) => {
        const shape: Record<string, z.ZodType> = {
            [typeKey]: z.literal(type.name),
        };

        for (const field of type.fields ?? []) {
            shape[field.name] = fieldToSchema(
                field,
                context,
                options,
                `${path}<${type.name}>.${field.name}`,
            );
        }

        return z.object(shape);
    });

    if (variants.length === 1) return variants[0];

    return z.discriminatedUnion(typeKey, variants as any);
}

/* ------------------------------------------------------------------ */
/* Specialized fields                                                 */
/* ------------------------------------------------------------------ */

function translateKeyValue(field: CmsField): z.ZodType {
    let schema: z.ZodType = z.record(z.string(), z.string());
    const minimum = field.min ?? (isRequired(field) ? 1 : 0);

    if (minimum > 0 || field.max !== undefined) {
        schema = schema.refine((value) => {
            const count =
                value && typeof value === "object" && !Array.isArray(value)
                    ? Object.keys(value).length
                    : 0;

            if (count < minimum) return false;
            if (field.max !== undefined && count > field.max) return false;

            return true;
        }, { error: "Invalid number of key/value pairs" });
    }

    return schema;
}

function translateCode(field: CmsField): z.ZodType {
    const code = isRequired(field) ? z.string().min(1) : z.string();

    if (field.output_code_only) return code;

    const codeKey = field.keys?.code ?? "code";
    const langKey = field.keys?.lang ?? "lang";

    return z.object({
        [codeKey]: code,
        [langKey]: z.string(),
    });
}

function translateCompute(field: CmsField): z.ZodType {
    return field.value?.trim() === "{{index}}" ? z.number() : z.string();
}

function translateHidden(field: CmsField): z.ZodType {
    return field.default === undefined ? z.string() : schemaFromValue(field.default);
}

function translateColor(field: CmsField): z.ZodType {
    const pattern = field.enableAlpha ? /^#[0-9A-Fa-f]{8}$/ : /^#[0-9A-Fa-f]{6}$/;
    return applyPattern(z.string().regex(pattern, "Invalid color value"), field.pattern);
}

function translateMap(field: CmsField): z.ZodType {
    const expectedType = field.type ?? "Point";

    return z.string().refine((value) => {
        try {
            const parsed = JSON.parse(value);

            return Boolean(
                parsed &&
                typeof parsed === "object" &&
                parsed.type === expectedType &&
                Array.isArray(parsed.coordinates),
            );
        } catch {
            return false;
        }
    }, { error: `Expected ${expectedType} GeoJSON` });
}

function translateUuid(field: CmsField): z.ZodType {
    const prefix = escapeRegExp(field.prefix ?? "");

    const pattern = field.use_b32_encoding
        ? new RegExp(`^${prefix}[0-9A-Z]{26}$`)
        : new RegExp(
            `^${prefix}` +
            `[0-9a-f]{8}-` +
            `[0-9a-f]{4}-` +
            `[0-9a-f]{4}-` +
            `[0-9a-f]{4}-` +
            `[0-9a-f]{12}$`,
        );

    return z.string().regex(pattern, "Invalid UUID");
}

function translateUnknown(
    widget: string,
    options: CmsSchemaOptions,
    path: string,
): z.ZodType {
    if (options.unknownWidget === "unknown") return z.unknown();
    if (options.unknownWidget === "string") return z.string();

    throw new Error(
        `Unknown Sveltia widget "${widget}" at "${path}". ` +
        `Add support for it or configure unknownWidget.`,
    );
}

/* ------------------------------------------------------------------ */
/* Options                                                            */
/* ------------------------------------------------------------------ */

function effectiveImageMode(field: CmsField, options: CmsSchemaOptions): CmsImageMode {
    return field.astro?.image ?? options.image ?? "public";
}

function effectiveDateTimeMode(
    field: CmsField,
    options: CmsSchemaOptions,
): CmsDateTimeMode {
    return field.astro?.datetime ?? options.datetime ?? "string";
}

function effectiveRelationMode(options: CmsSchemaOptions): CmsRelationMode {
    return options.relation ?? "string-or-number";
}

function isDocumentBody(field: CmsField, options: CmsSchemaOptions): boolean {
    if (options.bodyMode !== "document") return false;
    return field.name === (options.bodyField ?? "body");
}

function isRequired(field: CmsField): boolean {
    if (field.required === false) return false;
    if (Array.isArray(field.required)) return false;
    return true;
}

/* ------------------------------------------------------------------ */
/* Generic helpers                                                    */
/* ------------------------------------------------------------------ */

function arrayWithLimits(item: z.ZodType, field: CmsField): z.ZodType {
    let schema = z.array(item);
    const minimum = field.min ?? (isRequired(field) ? 1 : 0);

    if (minimum > 0) schema = schema.min(minimum);
    if (field.max !== undefined && Number.isFinite(field.max)) {
        schema = schema.max(field.max);
    }

    return schema;
}

function literalUnion(values: readonly (string | number)[]): z.ZodType {
    const unique = [...new Set(values)];

    if (unique.length === 1) return z.literal(unique[0]);

    return z.union(
        unique.map((value) => z.literal(value)) as any,
    );
}

function applyPattern(
    schema: z.ZodType<string>,
    pattern?: readonly [string | RegExp, string],
): z.ZodType<string> {
    if (!pattern) return schema;

    const [expression, message] = pattern;
    const regex = expression instanceof RegExp ? expression : parseRegExp(expression);

    return schema.refine((value) => {
        regex.lastIndex = 0;
        return regex.test(value);
    }, { error: message });
}

function parseRegExp(expression: string): RegExp {
    const delimited = expression.match(/^\/(.*)\/([a-z]*)$/);

    return delimited
        ? new RegExp(delimited[1], delimited[2])
        : new RegExp(expression);
}

function schemaFromValue(value: unknown): z.ZodType {
    if (value === null) return z.null();

    switch (typeof value) {
        case "string":
            return z.string();

        case "number":
            return z.number();

        case "boolean":
            return z.boolean();

        case "object":
            if (Array.isArray(value)) return z.array(z.unknown());

            return z.object(
                Object.fromEntries(
                    Object.entries(value as Record<string, unknown>).map(
                        ([key, child]) => [key, schemaFromValue(child)],
                    ),
                ),
            );

        default:
            return z.unknown();
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRootField(
    fields: readonly CmsField[],
    allowRootList: boolean,
): CmsField | undefined {
    if (fields.length !== 1) return undefined;

    const field = fields[0];

    if (!field.root) return undefined;
    if (field.widget === "keyvalue") return field;
    if (field.widget === "list" && allowRootList) return field;

    return undefined;
}