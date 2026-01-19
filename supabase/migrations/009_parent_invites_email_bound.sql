-- ============================================================================
-- LEAGUE OF STARS - EMAIL-BOUND PARENT INVITE CODES
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- Required for digest() / gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Parent invites table (email-bound)
CREATE TABLE IF NOT EXISTS parent_invites (
  invite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_email TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  redeemed_by UUID REFERENCES auth.users(id),
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (parent_email, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_invites_email ON parent_invites (LOWER(parent_email));
CREATE INDEX IF NOT EXISTS idx_parent_invites_code_hash ON parent_invites (code_hash);
CREATE INDEX IF NOT EXISTS idx_parent_invites_active ON parent_invites (active);

ALTER TABLE parent_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage parent invites" ON parent_invites;

CREATE POLICY "Admins manage parent invites"
ON parent_invites FOR ALL
USING (has_permission(auth.uid(), 'students.view_all'))
WITH CHECK (has_permission(auth.uid(), 'students.view_all'));

-- 2) Email-bound redemption function
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
  v_invite_id UUID;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_email = '' THEN
    RAISE EXCEPTION 'Missing email';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'parent' THEN
    RAISE EXCEPTION 'Only parents can redeem codes';
  END IF;

  v_hash := encode(digest(code_text, 'sha256'), 'hex');

  SELECT invite_id, student_id
  INTO v_invite_id, v_student_id
  FROM parent_invites
  WHERE code_hash = v_hash
    AND active = TRUE
    AND LOWER(parent_email) = v_email
  LIMIT 1
  FOR UPDATE;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;

  UPDATE parent_invites
  SET active = FALSE,
      redeemed_by = v_user_id,
      redeemed_at = NOW()
  WHERE invite_id = v_invite_id
    AND active = TRUE;

  INSERT INTO parent_students (parent_id, student_id)
  VALUES (v_user_id, v_student_id)
  ON CONFLICT DO NOTHING;

  RETURN v_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_student_invite_code(TEXT) TO authenticated;
