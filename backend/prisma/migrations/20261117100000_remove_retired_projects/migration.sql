DELETE FROM "projects"
WHERE "id" IN (
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000013'
);

UPDATE "projects"
SET "homepage_position" = NULL;

WITH "ranked_projects" AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            ORDER BY "created_at" ASC, "id" ASC
        ) AS "position"
    FROM "projects"
)
UPDATE "projects" AS "project"
SET "homepage_position" = "ranked_projects"."position"::SMALLINT
FROM "ranked_projects"
WHERE "ranked_projects"."id" = "project"."id"
  AND "ranked_projects"."position" <= 9;
