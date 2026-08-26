import type {ImageMetadata} from "astro";

export type CmsImageMode = "local" | "public";
export type CmsDateTimeMode = "string" | "date";
export type CmsRelationMode = "string" | "number" | "string-or-number";
export type CmsBodyMode = "document" | "field";

export interface AstroFieldOptions {
    image?: CmsImageMode;
    datetime?: CmsDateTimeMode;

    /**
     * false:
     *   never use Astro reference() for this field.
     *
     * true:
     *   use the field's Sveltia collection as the Astro collection.
     *
     * string:
     *   explicitly name the Astro collection.
     */
    reference?: boolean | string;
}

export interface CmsVariableType {
    name: string;
    label?: string;
    widget?: "object";
    fields?: readonly CmsField[];

    [key: string]: unknown;
}

export interface CmsField {
    name: string;
    widget?: string;

    required?: boolean | readonly string[];
    default?: unknown;
    pattern?: readonly [string | RegExp, string];

    type?: string;
    prefix?: string;
    suffix?: string;
    minlength?: number;
    maxlength?: number;

    min?: number;
    max?: number;

    value_type?: "int" | "float" | "int/string" | "float/string";

    multiple?: boolean;

    options?: readonly (
        | string
        | number
        | {
        label?: string;
        value: string | number;
    }
        )[];

    field?: CmsField;
    fields?: readonly CmsField[];
    types?: readonly CmsVariableType[];
    typeKey?: string;
    root?: boolean;

    output_code_only?: boolean;
    keys?: {
        code?: string;
        lang?: string;
    };

    enableAlpha?: boolean;

    format?: string;
    date_format?: string | boolean;
    time_format?: string | boolean;

    value?: string;

    collection?: string;
    file?: string;
    value_field?: string;

    use_b32_encoding?: boolean;

    astro?: AstroFieldOptions;

    [key: string]: unknown;
}

export interface CmsSchemaOptions {
    image?: CmsImageMode;
    datetime?: CmsDateTimeMode;
    relation?: CmsRelationMode;

    bodyMode?: CmsBodyMode;
    bodyField?: string;

    unknownWidget?: "throw" | "unknown" | "string";
}

export interface CmsAstroOptions extends CmsSchemaOptions {
    pattern?: string | string[];
    retainBody?: boolean;

    /**
     * Optional Astro entry ID override for a singleton.
     * Otherwise the filename determines the ID.
     */
    id?: string;
}

export type AstroOptionsOf<T> =
    T extends { astro: infer Options extends object }
        ? Options
        : {};

type MergeOptions<A, B> = Omit<A, keyof B> & B;

export type EffectiveCmsSchemaOptions<
    Parent,
    Child = never,
> =
    [Child] extends [never]
        ? AstroOptionsOf<Parent> & CmsSchemaOptions
        : MergeOptions<
        AstroOptionsOf<Parent>,
        AstroOptionsOf<Child>
    > & CmsSchemaOptions;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type IsOptional<F extends CmsField> =
    F extends { required: false | readonly string[] }
        ? true
        : false;

type EffectiveImageMode<
    F extends CmsField,
    O extends CmsSchemaOptions,
> =
    F extends { astro: { image: infer Mode extends CmsImageMode } }
        ? Mode
        : O extends { image: infer Mode extends CmsImageMode }
            ? Mode
            : "public";

type EffectiveDateTimeMode<
    F extends CmsField,
    O extends CmsSchemaOptions,
> =
    F extends { astro: { datetime: infer Mode extends CmsDateTimeMode } }
        ? Mode
        : O extends { datetime: infer Mode extends CmsDateTimeMode }
            ? Mode
            : "string";

type EffectiveRelationMode<O extends CmsSchemaOptions> =
    O extends { relation: infer Mode extends CmsRelationMode }
        ? Mode
        : "string-or-number";

type EffectiveBodyField<O extends CmsSchemaOptions> =
    O extends { bodyField: infer Name extends string }
        ? Name
        : "body";

type IsDocumentBody<
    F extends CmsField,
    O extends CmsSchemaOptions,
    TopLevel extends boolean,
> =
    TopLevel extends true
        ? O extends { bodyMode: "document" }
            ? F["name"] extends EffectiveBodyField<O>
                ? true
                : false
            : false
        : false;

type SelectValue<F extends CmsField> =
    F extends { options: readonly (infer Option)[] }
        ? Option extends { value: infer Value extends string | number }
            ? Value
            : Option extends string | number
                ? Option
                : never
        : string | number;

type ExplicitReferenceTarget<F extends CmsField> =
    F extends { astro: { reference: false } }
        ? never
        : F extends { astro: { reference: infer Target extends string } }
            ? Target
            : F extends { astro: { reference: true } }
                ? F extends { collection: infer Collection extends string }
                    ? Collection
                    : never
                : never;

type AutomaticReferenceTarget<F extends CmsField> =
    F extends { astro: { reference: false | string | true } }
        ? never
        : F extends { collection: infer Collection extends string }
            ? F extends { file: string }
                ? never
                : F extends { value_field: infer ValueField }
                    ? ValueField extends "{{slug}}"
                        ? Collection
                        : never
                    : Collection
            : never;

type ReferenceTarget<F extends CmsField> =
    ExplicitReferenceTarget<F> extends never
        ? AutomaticReferenceTarget<F>
        : ExplicitReferenceTarget<F>;

type PrimitiveRelationValue<O extends CmsSchemaOptions> =
    EffectiveRelationMode<O> extends "string"
        ? string
        : EffectiveRelationMode<O> extends "number"
            ? number
            : string | number;

type RelationValue<
    F extends CmsField,
    O extends CmsSchemaOptions,
> =
    ReferenceTarget<F> extends infer Collection extends string
        ? {
            collection: Collection;
            id: string;
        }
        : PrimitiveRelationValue<O>;

type HiddenValue<Value> =
    Value extends string
        ? string
        : Value extends number
            ? number
            : Value extends boolean
                ? boolean
                : Value extends null
                    ? null
                    : Value extends readonly unknown[]
                        ? unknown[]
                        : Value extends Record<string, unknown>
                            ? { [K in keyof Value]: HiddenValue<Value[K]> }
                            : unknown;

type CodeValue<F extends CmsField> =
    F["output_code_only"] extends true
        ? string
        : {
            [K in | (
                F extends { keys: { code: infer Code extends string } }
                    ? Code
                    : "code"
                )
                | (
                F extends { keys: { lang: infer Lang extends string } }
                    ? Lang
                    : "lang"
                )]: string;
        };

type VariableTypeValue<
    T extends CmsVariableType,
    O extends CmsSchemaOptions,
    TypeKey extends string,
> = Simplify<
    { [K in TypeKey]: T["name"] } &
    (
        T extends { fields: infer Fields extends readonly CmsField[] }
            ? InferSveltiaFieldsInternal<Fields, O, false>
            : {}
        )
>;

type VariableTypesValue<
    Types extends readonly CmsVariableType[],
    O extends CmsSchemaOptions,
    TypeKey extends string,
> =
    Types[number] extends infer Type extends CmsVariableType
        ? VariableTypeValue<Type, O, TypeKey>
        : never;

type ObjectValue<
    F extends CmsField,
    O extends CmsSchemaOptions,
> =
    F extends { fields: infer Fields extends readonly CmsField[] }
        ? InferSveltiaFieldsInternal<Fields, O, false>
        : F extends { types: infer Types extends readonly CmsVariableType[] }
            ? VariableTypesValue<
                Types,
                O,
                F extends { typeKey: infer Key extends string } ? Key : "type"
            >
            : unknown;

type ListItemValue<
    F extends CmsField,
    O extends CmsSchemaOptions,
> =
    F extends { field: infer Child extends CmsField }
        ? InferSveltiaField<Child, O>
        : F extends { fields: infer Fields extends readonly CmsField[] }
            ? InferSveltiaFieldsInternal<Fields, O, false>
            : F extends { types: infer Types extends readonly CmsVariableType[] }
                ? VariableTypesValue<
                    Types,
                    O,
                    F extends { typeKey: infer Key extends string } ? Key : "type"
                >
                : string;

type MultipleValue<F extends CmsField, Value> =
    F["multiple"] extends true ? Value[] : Value;

type BaseFieldValue<
    F extends CmsField,
    O extends CmsSchemaOptions,
> =
    F["widget"] extends "boolean"
        ? boolean

        : F["widget"] extends "number"
            ? F["value_type"] extends "int/string" | "float/string"
                ? string
                : number

            : F["widget"] extends "datetime"
                ? EffectiveDateTimeMode<F, O> extends "date"
                    ? Date
                    : string

                : F["widget"] extends "image"
                    ? MultipleValue<
                        F,
                        EffectiveImageMode<F, O> extends "local"
                            ? ImageMetadata
                            : string
                    >

                    : F["widget"] extends "file"
                        ? MultipleValue<F, string>

                        : F["widget"] extends "select"
                            ? MultipleValue<F, SelectValue<F>>

                            : F["widget"] extends "relation"
                                ? MultipleValue<F, RelationValue<F, O>>

                                : F["widget"] extends "object"
                                    ? ObjectValue<F, O>

                                    : F["widget"] extends "list"
                                        ? ListItemValue<F, O>[]

                                        : F["widget"] extends "keyvalue"
                                            ? Record<string, string>

                                            : F["widget"] extends "code"
                                                ? CodeValue<F>

                                                : F["widget"] extends "compute"
                                                    ? F["value"] extends "{{index}}"
                                                        ? number
                                                        : string

                                                    : F["widget"] extends "hidden"
                                                        ? F extends { default: infer Default }
                                                            ? HiddenValue<Default>
                                                            : string

                                                        : F["widget"] extends | "string"
                                                            | "text"
                                                            | "markdown"
                                                            | "richtext"
                                                            | "color"
                                                            | "map"
                                                            | "uuid"
                                                            ? string

                                                            : F["widget"] extends undefined
                                                                ? string

                                                                : O extends { unknownWidget: "unknown" }
                                                                    ? unknown

                                                                    : O extends { unknownWidget: "string" }
                                                                        ? string

                                                                        : unknown;

export type InferSveltiaField<
    F extends CmsField,
    O extends CmsSchemaOptions = {},
> = BaseFieldValue<F, O>;

type RequiredFields<
    Fields extends readonly CmsField[],
    O extends CmsSchemaOptions,
    TopLevel extends boolean,
> = {
    [F in Fields[number] as IsDocumentBody<F, O, TopLevel> extends true
        ? never
        : IsOptional<F> extends true
            ? never
            : F["name"]]: InferSveltiaField<F, O>;
};

type OptionalFields<
    Fields extends readonly CmsField[],
    O extends CmsSchemaOptions,
    TopLevel extends boolean,
> = {
    [F in Fields[number] as IsDocumentBody<F, O, TopLevel> extends true
        ? never
        : IsOptional<F> extends true
            ? F["name"]
            : never]?: InferSveltiaField<F, O>;
};

type InferSveltiaFieldsInternal<
    Fields extends readonly CmsField[],
    O extends CmsSchemaOptions,
    TopLevel extends boolean,
> = Simplify<
    RequiredFields<Fields, O, TopLevel> &
    OptionalFields<Fields, O, TopLevel>
>;

export type InferSveltiaFields<
    Fields extends readonly CmsField[],
    O extends CmsSchemaOptions = {},
> = InferSveltiaFieldsInternal<Fields, O, true>;

type RootField<
    Fields extends readonly CmsField[],
    AllowRootList extends boolean,
> =
    Fields extends readonly [infer Field extends CmsField]
        ? Field extends { root: true }
            ? Field["widget"] extends "keyvalue"
                ? Field
                : Field["widget"] extends "list"
                    ? AllowRootList extends true
                        ? Field
                        : never
                    : never
            : never
        : never;

export type InferSveltiaDocument<
    Fields extends readonly CmsField[],
    Options extends CmsSchemaOptions = {},
    AllowRootList extends boolean = true,
> =
    [RootField<Fields, AllowRootList>] extends [never]
        ? InferSveltiaFields<Fields, Options>
        : InferSveltiaField<RootField<Fields, AllowRootList>, Options>;