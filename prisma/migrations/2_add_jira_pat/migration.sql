-- Add JIRA Personal Access Token field to boards table
ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "jiraPat" TEXT;
