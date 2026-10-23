/**
 * Postgres `bigint` columns are returned as strings by the pg driver to avoid
 * precision loss. We store monetary values in minor units (e.g. kobo) as
 * bigint; this transformer surfaces them as numbers in the entity layer.
 */
export const bigintTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};
