-- ============================================================================
-- LEAGUE OF STARS - PARENT/STUDENT ACCESS + DEMO SUPPORT
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- 1) Add parent + student roles
INSERT INTO roles (role_name, description, priority) VALUES
('parent', 'Parent portal access limited to linked children', 6),
('student', 'Student portal access limited to own record', 7)
ON CONFLICT (role_name) DO NOTHING;

-- 2) Parent-student link table
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON parent_students(student_id);

ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view their linked students" ON parent_students;
DROP POLICY IF EXISTS "Admins can manage parent-student links" ON parent_students;

CREATE POLICY "Parents can view their linked students"
ON parent_students FOR SELECT
USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage parent-student links"
ON parent_students FOR ALL
USING (has_permission(auth.uid(), 'students.view_all'))
WITH CHECK (has_permission(auth.uid(), 'students.view_all'));

-- 3) Students table access: parent + student self
DROP POLICY IF EXISTS "Parents can view linked students" ON students;
DROP POLICY IF EXISTS "Students can view own student record" ON students;

CREATE POLICY "Parents can view linked students"
ON students FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM parent_students ps
    WHERE ps.parent_id = auth.uid()
    AND ps.student_id = students.student_id
  )
);

CREATE POLICY "Students can view own student record"
ON students FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
    AND p.linked_student_id = students.student_id
  )
);

-- 4) Merit log access: student self
DROP POLICY IF EXISTS "Students can view own merit" ON merit_log;

CREATE POLICY "Students can view own merit"
ON merit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
    AND p.linked_student_id = merit_log.student_id
  )
);

-- 5) Parent-safe merit view (no teacher names)
CREATE OR REPLACE VIEW merit_log_parent AS
SELECT
  id,
  student_id,
  student_name,
  grade,
  section,
  house,
  r,
  subcategory,
  points,
  date_of_event,
  timestamp
FROM merit_log
WHERE EXISTS (
  SELECT 1
  FROM parent_students ps
  WHERE ps.parent_id = auth.uid()
  AND ps.student_id = merit_log.student_id
);

GRANT SELECT ON merit_log_parent TO authenticated;
