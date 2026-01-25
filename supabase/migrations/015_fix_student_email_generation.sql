-- Recompute student_email using firstname.lastname@daais.org
-- Uses first token as first name, last token as last name (diacritics removed).
-- Duplicates get numeric suffixes (e.g., john.smith2@daais.org).

CREATE EXTENSION IF NOT EXISTS unaccent;

WITH normalized AS (
  SELECT
    student_id,
    LOWER(TRIM(REGEXP_REPLACE(unaccent(student_name), '\\s+', ' ', 'g'))) AS clean_name
  FROM students
),
parts AS (
  SELECT
    student_id,
    clean_name,
    SPLIT_PART(clean_name, ' ', 1) AS first_name,
    SPLIT_PART(clean_name, ' ', ARRAY_LENGTH(STRING_TO_ARRAY(clean_name, ' '), 1)) AS last_name
  FROM normalized
),
ranked AS (
  SELECT
    student_id,
    (first_name || '.' || last_name || '@daais.org') AS base_email,
    ROW_NUMBER() OVER (
      PARTITION BY (first_name || '.' || last_name)
      ORDER BY student_id
    ) AS rn
  FROM parts
)
UPDATE students s
SET student_email = CASE
  WHEN ranked.rn = 1 THEN ranked.base_email
  ELSE SPLIT_PART(ranked.base_email, '@', 1) || ranked.rn || '@' || SPLIT_PART(ranked.base_email, '@', 2)
END
FROM ranked
WHERE s.student_id = ranked.student_id;
