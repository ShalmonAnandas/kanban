-- Add color column to columns table
ALTER TABLE "columns" ADD COLUMN IF NOT EXISTS "color" TEXT;
