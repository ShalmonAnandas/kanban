-- Add pinned column to tasks table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;
