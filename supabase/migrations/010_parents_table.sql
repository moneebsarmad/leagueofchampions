-- ============================================================================
-- LEAGUE OF STARS - PARENTS TABLE
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

CREATE TABLE IF NOT EXISTS parents (
  parent_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian')),
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parents_email ON parents (LOWER(email));

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage parents" ON parents;
DROP POLICY IF EXISTS "Parents can view own record" ON parents;

CREATE POLICY "Admins manage parents"
ON parents FOR ALL
USING (has_permission(auth.uid(), 'students.view_all'))
WITH CHECK (has_permission(auth.uid(), 'students.view_all'));

CREATE POLICY "Parents can view own record"
ON parents FOR SELECT
USING (parent_id = auth.uid());
