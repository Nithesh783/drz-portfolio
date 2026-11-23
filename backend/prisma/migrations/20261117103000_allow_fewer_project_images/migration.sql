ALTER TABLE "projects"
DROP CONSTRAINT "projects_images_exactly_two";

ALTER TABLE "projects"
ADD CONSTRAINT "projects_images_max_two_nonempty"
CHECK (
    cardinality("images") <= 2
    AND array_position("images", NULL) IS NULL
    AND array_position("images", '') IS NULL
);
