-- ============================================================================
-- LEAGUE OF STARS - REDEEM USING students.parent_code
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- Required for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure parent_code is indexed for fast lookup
CREATE INDEX IF NOT EXISTS idx_students_parent_code ON students(parent_code);

-- Replace redemption function to use students.parent_code (hashed)
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
  FROM students
  WHERE parent_code = v_hash
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
