DROP INDEX "projects_homepage_position_key";

ALTER TABLE "projects"
DROP CONSTRAINT "projects_homepage_position_range";

UPDATE "projects"
SET "homepage_position" = NULL
WHERE "homepage_position" = 1
  AND (
      SELECT COUNT(*)
      FROM "projects"
      WHERE "homepage_position" IS NOT NULL
  ) > 8;

WITH "ranked_projects" AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (ORDER BY "homepage_position" ASC)::SMALLINT AS "position"
    FROM "projects"
    WHERE "homepage_position" IS NOT NULL
)
UPDATE "projects" AS "project"
SET "homepage_position" = "ranked_projects"."position"
FROM "ranked_projects"
WHERE "ranked_projects"."id" = "project"."id";

CREATE UNIQUE INDEX "projects_homepage_position_key"
ON "projects"("homepage_position");

ALTER TABLE "projects"
ADD CONSTRAINT "projects_homepage_position_range"
CHECK ("homepage_position" IS NULL OR "homepage_position" BETWEEN 1 AND 8);
