-- Add student_email column and backfill generated emails from student_name.
-- Format: firstname.lastname@daais.org (lowercased, diacritics removed).
-- Duplicates get numeric suffixes (e.g., john.smith2@daais.org).

CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS student_email TEXT;

WITH cleaned AS (
  SELECT
    student_id,
    NULLIF(TRIM(REGEXP_REPLACE(unaccent(student_name), '[^A-Za-z\\s]+', ' ', 'g')), '') AS cleaned_name
  FROM students
),
parts AS (
  SELECT
    student_id,
    cleaned_name,
    LOWER(NULLIF(SPLIT_PART(cleaned_name, ' ', 1), '')) AS first_name,
    LOWER(NULLIF((REGEXP_MATCH(cleaned_name, '([A-Za-z]+)\\s*$'))[1], '')) AS last_name
  FROM cleaned
),
bases AS (
  SELECT
    student_id,
    COALESCE(first_name, 'student') AS first_name,
    COALESCE(last_name, first_name, 'student') AS last_name
  FROM parts
),
ranked AS (
  SELECT
    student_id,
    (first_name || '.' || last_name || '@daais.org') AS base_email,
    ROW_NUMBER() OVER (
      PARTITION BY (first_name || '.' || last_name)
      ORDER BY student_id
    ) AS rn
  FROM bases
)
UPDATE students s
SET student_email = CASE
  WHEN ranked.rn = 1 THEN ranked.base_email
  ELSE SPLIT_PART(ranked.base_email, '@', 1) || ranked.rn || '@' || SPLIT_PART(ranked.base_email, '@', 2)
END
FROM ranked
WHERE s.student_id = ranked.student_id
  AND (s.student_email IS NULL OR s.student_email = '');
