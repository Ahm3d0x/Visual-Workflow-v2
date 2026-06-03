-- =======================================================
-- MIGRATION: 20260603000001_add_whiteboard_columns.sql
-- DESCRIPTION: Adds is_whiteboard and board_data columns to workflows
-- =======================================================

ALTER TABLE public.workflows ADD COLUMN is_whiteboard BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.workflows ADD COLUMN board_data JSONB DEFAULT '{}'::jsonb;
