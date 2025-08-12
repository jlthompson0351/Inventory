### Reporting RPC Spec (Phase 2)

This document defines the backend interface and SQL generation strategy for executing schema‑driven reports in Supabase.

---

## Goals
- Single RPC to execute reports using a validated, schema-driven config
- Strict allowlist for fields/joins/operators
- RLS respected (no bypass), org-scoped automatically
- Pagination, multi-sort, filters, optional group/aggregates
- Deterministic column and record ordering, matching UI and exports

---

## Function design

- Name: `execute_report_query`
- Security: `SECURITY INVOKER` (RLS enforced)
- Language: `plpgsql`
- Search path: `SET LOCAL search_path TO public;`

### Inputs
- `p_organization_id uuid` (required): active org
- `p_config jsonb` (required): report configuration

Config JSON (subset; aligns with UI + reporting-schema.json):
```
{
  "subject": "assets" | "asset_types" | "inventory_items" | "inventory_history" | "form_submissions",
  "dataSources": ["assets", ...],
  "columns": ["assets.name", "asset_types.name", ...],
  "filters": [
    { "field": "assets.status", "operator": "equals", "value": "active" },
    { "field": "inventory_items.quantity", "operator": "greater_than", "value": 0 }
  ],
  "sorts": [
    { "field": "assets.created_at", "direction": "desc", "nullsFirst": false },
    { "field": "asset_types.name", "direction": "asc" }
  ],
  "assetTypes": ["<uuid>", ...],
  "aggregations": [
    { "field": "inventory_items.quantity", "function": "sum", "alias": "total_qty", "groupBy": ["asset_types.name"] }
  ],
  "pagination": { "page": 1, "limit": 100 },
  "pinnedRows": ["<primaryKeyValue>", ...] // optional
}
```

### Output
Returns a set of rows with metadata columns:
- `row jsonb`: each row is a JSON object where keys are field IDs (e.g., `"assets.name"`)
- `total_count bigint`: total number of rows across full result set
- `execution_ms integer`: measured duration

This design enables pagination with total-count in one round trip.

```
TABLE (
  row jsonb,
  total_count bigint,
  execution_ms integer
)
```

---

## Validation (server‑side)
Perform these checks before building SQL. Reject with clear errors (400‑class) if any fail.

1) Organization
- `p_organization_id` non-null UUID

2) Subject and data sources
- `subject` present and allowed by schema
- Each `dataSources[]` is defined in schema
- Require `subject` to be present in `dataSources` (or derive as primary)

3) Columns
- Every `columns[]` must exist in schema for at least one selected source
- If a column has `requiresJoin`, ensure the corresponding join is allowlisted from the subject

4) Filters
- Each filter.field must be in schema
- Operator must be allowed for the field type (per schema `notes.operators` or field override)

5) Sorts
- Each sort.field must be selected in `columns[]` or resolvable from schema

6) Aggregations
- Aggregation functions allowlist: sum, avg, count, min, max, median, stddev
- If aggregations are present, either:
  - all non-aggregated selected fields appear in GROUP BY, or
  - the function enforces a safe mode that auto-populates GROUP BY with non-aggregates

7) Pagination & limits
- `limit` in [1, 1000]; default 100
- `page` >= 1

8) Safety knobs
- Max sources per query: 5
- Max columns: 60
- Max filters: 30
- Max sorts: 5

---

## SQL generation plan (safe & parameterized)

Key principle: never interpolate untrusted text directly. All dynamic identifiers come from an allowlist derived from the server’s copy of the schema mapping.

Recommended: create a server-side mapping table to mirror the frontend `reporting-schema.json` in a minimal, authoritative form.

### Suggested metadata tables

- `reporting_entities(entity_id text primary key, table_name text not null)`
- `reporting_fields(field_id text primary key, entity_id text not null, sql_expr text not null, requires_join text null, field_type text not null, sortable boolean, aggregatable boolean)`
- `reporting_joins(entity_id text not null, join_to text not null, join_type text not null, join_on text not null)`

Populate these via migration based on the current JSON. Only rows present in these tables are selectable in RPC.

### Build steps

1) Resolve primary entity
- Choose subject as primary; if empty, choose the source with most selected columns

2) Resolve SELECT list
- For each requested column, map `field_id` to `sql_expr` using `reporting_fields`
- Build JSON projection using `jsonb_build_object` pairs to guarantee keys match UI `field_id`:
```
SELECT jsonb_build_object(
  'assets.id', assets.id,
  'assets.name', assets.name,
  'asset_types.name', asset_types.name
  -- etc.
) AS row
```

3) Build FROM + JOINS
- Start from the primary table; add only allowlisted joins required by columns/filters/sorts
- Use left joins unless otherwise specified in `reporting_joins`

4) Organization scope + soft-deletes
- Always add `WHERE <primary_or_joined>.organization_id = $1`
- Optionally add `deleted_at IS NULL` where relevant

5) Filters
- For each filter generate parameterized conditions, respecting case-insensitivity (ILIKE) rules
- Examples (parameter placeholders shown):
  - equals: `expr = $n`
  - in: `expr = ANY($n)`
  - contains: `expr ILIKE '%' || $n || '%'
  - between: `expr BETWEEN $n AND $n+1`

6) Aggregations / Grouping
- If aggregations present, add `SELECT` aggregate expressions and `GROUP BY` for non-aggregated fields (validated earlier)
- For aggregate rows, still build `row` JSON from selected expressions/aliases

7) Sorting
- Multi-sort with `NULLS FIRST/LAST` per flag
- Preserve order of sorts exactly as requested
- Pinned rows (optional): prepend an ORDER BY CASE list
```
ORDER BY
  CASE WHEN primary_key IN ($pk_list) THEN 0 ELSE 1 END,
  sort1_field ASC NULLS LAST,
  sort2_field DESC NULLS LAST
```

8) Pagination and total count
- Use LIMIT/OFFSET for page/limit
- Compute `total_count` with a window function:
```
COUNT(*) OVER() AS total_count
```
- Wrap in outer SELECT to expose `(row, total_count, execution_ms)`

9) Timing
- Use `clock_timestamp()` diff or `EXPLAIN (ANALYZE, BUFFERS FALSE, FORMAT JSON)` in a gated mode to compute `execution_ms`
- Return simple `execution_ms` integer

---

## Function skeleton (DDL template)

Note: This is a template — actual implementation must fetch allowed `sql_expr` from metadata tables to avoid injection.

```sql
create or replace function public.execute_report_query(
  p_organization_id uuid,
  p_config jsonb
)
returns table (
  row jsonb,
  total_count bigint,
  execution_ms integer
)
security invoker
language plpgsql
as $$
declare
  v_started timestamp := clock_timestamp();
  v_subject text;
  v_limit int := coalesce((p_config->'pagination'->>'limit')::int, 100);
  v_page int := coalesce((p_config->'pagination'->>'page')::int, 1);
  v_offset int := (v_page - 1) * v_limit;
  v_sql text;
begin
  -- 1) validate organization
  if p_organization_id is null then
    raise exception 'organization_id required';
  end if;

  -- 2) resolve subject & validate config (omitted for brevity)
  v_subject := coalesce(p_config->>'subject', 'assets');

  -- 3) build SQL safely using allowlisted mappings (pseudo)
  --    SELECT jsonb_build_object(...fields...) AS row,
  --           COUNT(*) OVER() AS total_count
  --    FROM primary
  --      [JOINS]
  --    WHERE primary.organization_id = $1 AND [filters]
  --    [GROUP BY]
  --    ORDER BY [sorts]
  --    LIMIT v_limit OFFSET v_offset;

  -- 4) EXECUTE using USING parameters array
  -- return query execute v_sql using p_organization_id, ...params;

  return query
  select row, total_count,
         extract(millisecond from (clock_timestamp() - v_started))::int as execution_ms
  from (
    select jsonb_build_object() as row, 0::bigint as total_count
  ) t
  limit 0; -- placeholder until implemented
end;
$$;
```

---

## Error model
- 400 invalid_configuration: subject/dataSources/columns/filters/sorts invalid per schema
- 400 disallowed_join: requested field requires a join that is not allowlisted
- 400 operator_not_allowed: operator not allowed for field type
- 413 result_too_large: limit exceeds max; or too many sources/columns
- 500 execution_failed: unexpected error during query execution

---

## RLS and security notes
- `SECURITY INVOKER` ensures RLS is applied
- Always filter by `organization_id` of the primary table; for joined tables, prefer join predicates that also include org columns to avoid cross-org leakage
- All dynamic identifiers originate from the server‑side metadata tables only
- All values are bound parameters; no string concatenation of user values

---

## Frontend integration notes
- The UI already uses field IDs from the schema; RPC returns rows as `jsonb` with the same keys → exports remain consistent
- Keep page/limit and multi-sort in sync with builder state
- Cache key should include org + schema version + normalized config + page/sort

---

## Next steps
- Implement metadata tables and migration to mirror `reporting-schema.json`
- Implement `execute_report_query` building SQL from metadata tables
- Add a lightweight `execute_report_query_dry_run(p_config)` that returns the resolved SELECT/JOIN/WHERE/ORDER as JSON for debugging
- Wire frontend to call the RPC (feature flag) and record `execution_ms` + `total_count`

