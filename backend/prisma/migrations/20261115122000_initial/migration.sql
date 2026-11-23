CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_type" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "project_link" TEXT NOT NULL,
    "images" TEXT[] NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_images_exactly_two" CHECK (
        cardinality("images") = 2
        AND "images"[1] IS NOT NULL AND "images"[1] <> ''
        AND "images"[2] IS NOT NULL AND "images"[2] <> ''
    )
);

CREATE TABLE "enquiries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "project_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'New',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enquiries_project_id_fkey" FOREIGN KEY ("project_id")
        REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "enquiries_status_allowed" CHECK ("status" IN ('New', 'In Progress', 'Completed'))
);

CREATE INDEX "enquiries_created_at_idx" ON "enquiries"("created_at" DESC);
CREATE INDEX "enquiries_project_id_idx" ON "enquiries"("project_id");

CREATE TABLE "admin_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_accounts_email_key" UNIQUE ("email"),
    CONSTRAINT "admin_accounts_role_admin" CHECK ("role" = 'admin')
);
