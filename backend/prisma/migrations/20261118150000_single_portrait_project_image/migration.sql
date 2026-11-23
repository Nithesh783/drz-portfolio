UPDATE "projects"
SET "images" = ARRAY["images"[2]]
WHERE cardinality("images") > 1;

ALTER TABLE "projects"
DROP CONSTRAINT "projects_images_max_two_nonempty";

ALTER TABLE "projects"
ADD CONSTRAINT "projects_images_max_one_nonempty"
CHECK (
    cardinality("images") <= 1
    AND array_position("images", NULL) IS NULL
    AND array_position("images", '') IS NULL
);
