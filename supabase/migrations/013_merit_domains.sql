-- ============================================================================
-- LEAGUE OF CHAMPIONS - MERIT DOMAINS (MIGRATION 013)
-- Adds domain tracking to merit_log for culture health analytics
-- ============================================================================

-- TABLE: merit_domains
-- Purpose: Reference table for merit/recognition domains (where behavior occurred)
CREATE TABLE IF NOT EXISTS merit_domains (
  id SERIAL PRIMARY KEY,
  domain_key TEXT NOT NULL UNIQUE,
  domain_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#2D5016',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 5 merit domains
INSERT INTO merit_domains (domain_key, domain_name, display_name, description, color, display_order)
VALUES
  ('prayer_space', 'Prayer Space', 'Prayer Space', 'Salah, wudu, masjid adab, spiritual moments', '#2D5016', 1),
  ('hallways', 'Hallways/Transitions', 'Hallways', 'Walking, transitions, movement between classes', '#1e40af', 2),
  ('lunch_recess', 'Lunch/Recess', 'Lunch/Recess', 'Cafeteria, playground, unstructured time', '#B8860B', 3),
  ('washroom', 'Washroom', 'Washrooms', 'Bathroom etiquette, cleanliness, wudu area', '#0d9488', 4),
  ('classroom', 'Classroom & Learning', 'Classrooms', 'Academic behavior, learning engagement, participation', '#7c3aed', 5)
ON CONFLICT (domain_key) DO UPDATE SET
  domain_name = EXCLUDED.domain_name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order;

-- Add domain_id column to merit_log
ALTER TABLE merit_log
ADD COLUMN IF NOT EXISTS domain_id INTEGER REFERENCES merit_domains(id);

-- Create index for domain queries
CREATE INDEX IF NOT EXISTS idx_merit_log_domain ON merit_log(domain_id);

-- Enable RLS on merit_domains
ALTER TABLE merit_domains ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read domains
CREATE POLICY "Anyone can view merit_domains" ON merit_domains
  FOR SELECT TO authenticated USING (true);

-- Admins can manage domains
CREATE POLICY "Admins can manage merit_domains" ON merit_domains
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin')
    )
  );

-- Service role grants
GRANT ALL ON merit_domains TO service_role;
GRANT USAGE, SELECT ON SEQUENCE merit_domains_id_seq TO service_role;

-- ============================================================================
-- Seed existing merit_log records with contextually appropriate domains
-- Based on subcategory/category keywords
-- ============================================================================

-- Prayer Space: prayer, salah, wudu, masjid, adab related
UPDATE merit_log SET domain_id = (
  SELECT id FROM merit_domains WHERE domain_key = 'prayer_space'
)
WHERE domain_id IS NULL
AND (
  LOWER(subcategory) LIKE '%prayer%'
  OR LOWER(subcategory) LIKE '%salah%'
  OR LOWER(subcategory) LIKE '%wudu%'
  OR LOWER(subcategory) LIKE '%masjid%'
  OR LOWER(subcategory) LIKE '%adab%'
  OR LOWER(subcategory) LIKE '%khushu%'
  OR LOWER(subcategory) LIKE '%dua%'
);

-- Hallways: hallway, transition, walking, line related
UPDATE merit_log SET domain_id = (
  SELECT id FROM merit_domains WHERE domain_key = 'hallways'
)
WHERE domain_id IS NULL
AND (
  LOWER(subcategory) LIKE '%hallway%'
  OR LOWER(subcategory) LIKE '%transition%'
  OR LOWER(subcategory) LIKE '%walking%'
  OR LOWER(subcategory) LIKE '%line%'
  OR LOWER(subcategory) LIKE '%corridor%'
);

-- Lunch/Recess: lunch, recess, playground, cafeteria related
UPDATE merit_log SET domain_id = (
  SELECT id FROM merit_domains WHERE domain_key = 'lunch_recess'
)
WHERE domain_id IS NULL
AND (
  LOWER(subcategory) LIKE '%lunch%'
  OR LOWER(subcategory) LIKE '%recess%'
  OR LOWER(subcategory) LIKE '%playground%'
  OR LOWER(subcategory) LIKE '%cafeteria%'
  OR LOWER(subcategory) LIKE '%eating%'
  OR LOWER(subcategory) LIKE '%sharing%'
);

-- Washroom: washroom, bathroom, wudu area related
UPDATE merit_log SET domain_id = (
  SELECT id FROM merit_domains WHERE domain_key = 'washroom'
)
WHERE domain_id IS NULL
AND (
  LOWER(subcategory) LIKE '%washroom%'
  OR LOWER(subcategory) LIKE '%bathroom%'
  OR LOWER(subcategory) LIKE '%restroom%'
  OR LOWER(subcategory) LIKE '%toilet%'
);

-- Classroom: homework, class, participation, academic related
UPDATE merit_log SET domain_id = (
  SELECT id FROM merit_domains WHERE domain_key = 'classroom'
)
WHERE domain_id IS NULL
AND (
  LOWER(subcategory) LIKE '%homework%'
  OR LOWER(subcategory) LIKE '%class%'
  OR LOWER(subcategory) LIKE '%participation%'
  OR LOWER(subcategory) LIKE '%prepared%'
  OR LOWER(subcategory) LIKE '%assignment%'
  OR LOWER(subcategory) LIKE '%academic%'
  OR LOWER(subcategory) LIKE '%learning%'
  OR LOWER(subcategory) LIKE '%punctual%'
  OR LOWER(subcategory) LIKE '%listening%'
  OR LOWER(subcategory) LIKE '%instruction%'
);

-- Default any remaining to classroom (most common context)
UPDATE merit_log SET domain_id = (
  SELECT id FROM merit_domains WHERE domain_key = 'classroom'
)
WHERE domain_id IS NULL;

-- ============================================================================
-- Output migration status
-- ============================================================================
DO $$
DECLARE
  domain_count INTEGER;
  seeded_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO domain_count FROM merit_domains;
  SELECT COUNT(*) INTO seeded_count FROM merit_log WHERE domain_id IS NOT NULL;
  RAISE NOTICE 'Merit domains migration completed: % domains created, % merit_log records seeded', domain_count, seeded_count;
END $$;
