-- Add images array field to tasks table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
