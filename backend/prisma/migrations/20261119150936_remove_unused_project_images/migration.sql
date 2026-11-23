UPDATE "projects"
SET
  "images" = array_remove("images", '/assets/noozari-mobile.png'),
  "updated_at" = CURRENT_TIMESTAMP
WHERE '/assets/noozari-mobile.png' = ANY("images");

UPDATE "projects"
SET
  "background_image" = NULL,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "background_image" = '/assets/jewel-house-background.png';
