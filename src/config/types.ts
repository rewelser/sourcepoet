type Defined<T> = Exclude<T, undefined>;

type Simplify<T> = {
    [K in keyof T]: T[K];
} & {};

export type MergeDefined<D, O> =
    [Defined<O>] extends [never]
        ? D
        : D extends readonly unknown[]
            ? Defined<O> extends readonly unknown[]
                ? Defined<O>
                : D | Defined<O>
            : D extends object
                ? Defined<O> extends object
                    ? Simplify<
                        {
                            [K in keyof D]:
                            K extends keyof Defined<O>
                                ? MergeDefined<D[K], Defined<O>[K]>
                                : D[K];
                        }
                        & Omit<Defined<O>, keyof D>
                    >
                    : D | Defined<O>
                : D | Defined<O>;