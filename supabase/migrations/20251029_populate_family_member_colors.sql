-- Populate family_members.color deterministically for rows where color IS NULL
-- Uses md5 hash of user_id (or id) to index into a fixed palette.
-- Run this after the migration that added the `color` column.

BEGIN;

UPDATE family_members
SET color = (
  -- pick from palette by hashing user_id (or fallback to id)
  (
    array['#f97316','#f43f5e','#8b5cf6','#06b6d4','#10b981','#f59e0b','#3b82f6','#ef4444','#7c3aed','#14b8a6']
  )[
    (
      (
        ('x' || substr(md5(coalesce(user_id::text, id::text)), 1, 8))::bit(32)::bigint
      ) % 10
    ) + 1
  ]
)
WHERE color IS NULL;

COMMIT;
