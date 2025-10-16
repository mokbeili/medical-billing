-- Restore billing_code_chain view if it gets dropped
-- Run this file with: psql $DATABASE_URL -f prisma/restore-view.sql

DROP VIEW IF EXISTS billing_code_chain;

-- Create recursive view for billing code chains
CREATE OR REPLACE VIEW billing_code_chain AS
WITH RECURSIVE chain AS (
  -- Roots: codes with no incoming edge
  SELECT
      bc.id                           AS code_id,
      bc.code                         AS code,
      bc.title                        AS title,
      COALESCE(bc.day_range, 0)::int  AS day_range,
      bc.id                           AS root_id,
      NULL::int                       AS previous_code_id,
      0::int                          AS previous_day_range,            -- cumulative up to previous = 0 at root
      COALESCE(bc.day_range, 0)::int  AS cumulative_day_range,          -- prev_cum + self
      COALESCE(bc.day_range, 0)::int  AS prev_plus_self,                -- previous_day_range + day_range
      NOT EXISTS (
        SELECT 1 FROM public.billing_code_relations r2
        WHERE r2.previous_code_id = bc.id
      )                             AS is_last,                         -- no outgoing edge
      ARRAY[bc.id]                  AS path_ids
  FROM public.billing_codes bc
  LEFT JOIN public.billing_code_relations r_in
         ON r_in.next_code_id = bc.id
  WHERE r_in.id IS NULL

  UNION ALL

  -- Walk forward
  SELECT
      bc_next.id                                          AS code_id,
      bc_next.code                                        AS code,
      bc_next.title                                       AS title,
      COALESCE(bc_next.day_range, 0)::int                 AS day_range,
      c.root_id                                           AS root_id,
      c.code_id                                           AS previous_code_id,
      c.cumulative_day_range                              AS previous_day_range,         -- previous cumulative
      (c.cumulative_day_range + COALESCE(bc_next.day_range, 0))::int
                                                          AS cumulative_day_range,
      (c.cumulative_day_range + COALESCE(bc_next.day_range, 0))::int
                                                          AS prev_plus_self,
      NOT EXISTS (
        SELECT 1 FROM public.billing_code_relations r2
        WHERE r2.previous_code_id = bc_next.id
      )                                                  AS is_last,                      -- no outgoing edge
      c.path_ids || bc_next.id                            AS path_ids
  FROM chain c
  JOIN public.billing_code_relations r
    ON r.previous_code_id = c.code_id
  JOIN public.billing_codes bc_next
    ON bc_next.id = r.next_code_id
  WHERE NOT bc_next.id = ANY (c.path_ids)                 -- safety against cycles
)
SELECT
    code_id,
    code,
    title,
    day_range,
    root_id,
    previous_code_id,
    previous_day_range,        -- cumulative up to (but excluding) this code
    cumulative_day_range,      -- cumulative including this code
    prev_plus_self,            -- equals previous_day_range + day_range
    is_last                    -- TRUE if no next code
FROM chain;

COMMENT ON VIEW billing_code_chain IS 'Recursive view showing billing code chains with cumulative day ranges and path tracking';

