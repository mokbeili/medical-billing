-- DropEnum
-- The ClaimStatus enum is no longer used after migration 20250724194807_add_service_status_enum
-- which replaced it with ServiceStatus. This migration documents its removal.
DROP TYPE IF EXISTS "ClaimStatus";

