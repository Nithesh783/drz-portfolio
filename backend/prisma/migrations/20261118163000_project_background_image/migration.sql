ALTER TABLE "projects"
ADD COLUMN "background_image" TEXT;

UPDATE "projects"
SET "background_image" = '/assets/jewel-house-background.png'
WHERE lower("project_name") = 'jewel house';
