-- ============================================================================
-- LEAGUE OF STARS - STUDENT INVITE CODES (PARENT LINKING)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- Required for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Student invite codes table
CREATE TABLE IF NOT EXISTS student_invite_codes (
  student_id UUID PRIMARY KEY REFERENCES students(student_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE student_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage student invite codes" ON student_invite_codes;

CREATE POLICY "Admins manage student invite codes"
ON student_invite_codes FOR ALL
USING (has_permission(auth.uid(), 'students.view_all'))
WITH CHECK (has_permission(auth.uid(), 'students.view_all'));

-- 2) Parent redemption function
CREATE OR REPLACE FUNCTION redeem_student_invite_code(code_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_hash TEXT;
  v_student_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'parent' THEN
    RAISE EXCEPTION 'Only parents can redeem codes';
  END IF;

  v_hash := encode(digest(code_text, 'sha256'), 'hex');

  SELECT student_id INTO v_student_id
  FROM student_invite_codes
  WHERE code_hash = v_hash
    AND active = TRUE
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;

  INSERT INTO parent_students (parent_id, student_id)
  VALUES (v_user_id, v_student_id)
  ON CONFLICT DO NOTHING;

  RETURN v_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_student_invite_code(TEXT) TO authenticated;
