-- ══════════════════════════════════════════════════════════════════
-- Migration 002: Animal placement slot
-- Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Run in Supabase SQL editor after 001_tribes.sql.
-- ══════════════════════════════════════════════════════════════════

-- Add slot column (0-based, matches the 3×2 SLOT_LABELS grid in the UI)
ALTER TABLE animals ADD COLUMN IF NOT EXISTS slot int NOT NULL DEFAULT 0;

-- Prevent two animals occupying the same slot on the same plot
CREATE UNIQUE INDEX IF NOT EXISTS animals_plot_slot_unique ON animals(plot_id, slot);

NOTIFY pgrst, 'reload schema';
