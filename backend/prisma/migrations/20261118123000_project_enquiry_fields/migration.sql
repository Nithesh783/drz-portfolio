ALTER TABLE "enquiries"
    ADD COLUMN "company_name" TEXT,
    ADD COLUMN "service_required" TEXT NOT NULL DEFAULT 'General enquiry',
    ADD COLUMN "budget_range" TEXT;
