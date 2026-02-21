-- Add subtitle column to boards table
ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
