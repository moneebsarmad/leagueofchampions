-- ============================================================================
-- LEAGUE OF CHAMPIONS - A/B/C STUDENT INTERVENTION FRAMEWORK (MIGRATION 012)
-- Implements the comprehensive behavioral management system for DAAIS
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- TABLE: behavioral_domains
-- Purpose: Reference table for the four behavioral domains
-- ============================================================================
CREATE TABLE IF NOT EXISTS behavioral_domains (
  id SERIAL PRIMARY KEY,
  domain_key TEXT NOT NULL UNIQUE,
  domain_name TEXT NOT NULL,
  description TEXT,
  expectations JSONB DEFAULT '[]'::jsonb,
  repair_menu_immediate JSONB DEFAULT '[]'::jsonb,
  repair_menu_restorative JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the four behavioral domains with repair menus
INSERT INTO behavioral_domains (domain_key, domain_name, description, expectations, repair_menu_immediate, repair_menu_restorative)
VALUES
  (
    'prayer_space',
    'Prayer Space (Salah & Transitions)',
    'Sacred space respect, wudu preparation, stillness during prayer, proper entry/exit',
    '["Maintain wudu properly", "Enter prayer space with adab", "Maintain stillness during salah", "Respectful entry and exit transitions"]'::jsonb,
    '["Redo entry with adab", "Silent line reset", "Apologize to affected peers", "Reset disrupted space"]'::jsonb,
    '["Write reflection on salah adab", "Help set up prayer space for next salah", "Staff commitment meeting"]'::jsonb
  ),
  (
    'hallways',
    'Hallways & Transitions',
    'Right-side flow, quiet voices, hands-to-self, respectful spacing',
    '["Walk on right side", "Use quiet voices", "Keep hands to self", "Maintain respectful spacing"]'::jsonb,
    '["Redo transition silently", "Flow correction practice", "Apologize for crowding or disruption"]'::jsonb,
    '["Greeting culture repair activity", "Reflection note on safety risks", "Hallway monitor helper duty"]'::jsonb
  ),
  (
    'lunch_recess',
    'Lunch/Recess & Unstructured Time',
    'Inclusion behaviors, environmental care, conflict resolution',
    '["Include others in activities", "Care for shared space and environment", "Resolve conflicts peacefully", "Follow adult directions promptly"]'::jsonb,
    '["Clean area fully", "Specific peer apology", "Supervised inclusion invitation to peer"]'::jsonb,
    '["Service repair (table/chair reset duty)", "Conflict replay writing exercise", "Lunch helper duty for week"]'::jsonb
  ),
  (
    'respect',
    'Respect & Community',
    'Appropriate speech, authority relationships, peer interactions, disagreement with dignity',
    '["Use appropriate and respectful language", "Respect authority figures", "Treat peers with kindness", "Disagree with dignity and respect"]'::jsonb,
    '["4-step apology format", "Public correction of public disrespect", "Private reflection time"]'::jsonb,
    '["72-hour respect contract", "Community service activity", "Restorative circle participation"]'::jsonb
  )
ON CONFLICT (domain_key) DO UPDATE SET
  domain_name = EXCLUDED.domain_name,
  description = EXCLUDED.description,
  expectations = EXCLUDED.expectations,
  repair_menu_immediate = EXCLUDED.repair_menu_immediate,
  repair_menu_restorative = EXCLUDED.repair_menu_restorative;

-- ============================================================================
-- TABLE: level_a_interventions
-- Purpose: Track in-the-moment coaching interventions (30-90 seconds)
-- ============================================================================
CREATE TABLE IF NOT EXISTS level_a_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  staff_id UUID REFERENCES auth.users(id),
  staff_name TEXT NOT NULL,

  -- Intervention Details
  domain_id INTEGER REFERENCES behavioral_domains(id),
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'pre_correct',
    'positive_narration',
    'quick_redirect',
    'redo',
    'choice_consequence',
    'private_check',
    'micro_repair',
    'quick_reinforcement'
  )),
  behavior_description TEXT,
  location TEXT,

  -- Outcome
  outcome TEXT NOT NULL DEFAULT 'complied' CHECK (outcome IN ('complied', 'escalated', 'partial')),
  escalated_to_b BOOLEAN DEFAULT FALSE,

  -- Context flags (for pattern detection and logging rules)
  is_repeated_same_day BOOLEAN DEFAULT FALSE,
  affected_others BOOLEAN DEFAULT FALSE,
  is_pattern_student BOOLEAN DEFAULT FALSE,

  -- Metadata
  event_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: level_b_interventions
-- Purpose: Track structured reset conferences (15-20 minutes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS level_b_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  staff_id UUID REFERENCES auth.users(id),
  staff_name TEXT NOT NULL,

  -- Intervention Details
  domain_id INTEGER REFERENCES behavioral_domains(id),
  escalation_trigger TEXT NOT NULL CHECK (escalation_trigger IN (
    'demerit_assigned',
    '3rd_incident_10days',
    'ignored_2plus_prompts',
    'peer_impact',
    'space_disruption',
    'safety_risk',
    'threshold_10_points'
  )),

  -- 7-Step Protocol Tracking (B1-B7)
  b1_regulate_completed BOOLEAN DEFAULT FALSE,
  b1_regulate_notes TEXT,

  b2_pattern_naming_completed BOOLEAN DEFAULT FALSE,
  b2_pattern_notes TEXT,

  b3_reflection_completed BOOLEAN DEFAULT FALSE,
  b3_reflection_prompts_used JSONB DEFAULT '[]'::jsonb,

  b4_repair_completed BOOLEAN DEFAULT FALSE,
  b4_repair_action_selected TEXT,

  b5_replacement_completed BOOLEAN DEFAULT FALSE,
  b5_replacement_skill_practiced TEXT,

  b6_reset_goal_completed BOOLEAN DEFAULT FALSE,
  b6_reset_goal TEXT,
  b6_reset_goal_timeline_days INTEGER CHECK (b6_reset_goal_timeline_days BETWEEN 1 AND 3),

  b7_documentation_completed BOOLEAN DEFAULT FALSE,

  -- Monitoring Period (3 school days, 80%+ success required)
  monitoring_start_date DATE,
  monitoring_end_date DATE,
  monitoring_method TEXT CHECK (monitoring_method IN ('checklist', 'verbal_check', 'written_log')),
  daily_success_rates JSONB DEFAULT '{}'::jsonb,
  final_success_rate DECIMAL(5,2),

  -- Outcome
  status TEXT DEFAULT 'in_progress' CHECK (status IN (
    'in_progress',
    'monitoring',
    'completed_success',
    'completed_escalated',
    'cancelled'
  )),
  escalated_to_c BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,

  -- Related Level A (if escalated from A)
  escalated_from_level_a_id UUID REFERENCES level_a_interventions(id),

  -- Metadata
  conference_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: level_c_cases
-- Purpose: Case management for intensive intervention (2-4 weeks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS level_c_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  case_manager_id UUID REFERENCES auth.users(id),
  case_manager_name TEXT,

  -- Case Classification
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'safety_incident',
    'no_improvement_2_level_b',
    'chronic_pattern',
    'post_oss_reentry',
    'threshold_20_points',
    'threshold_30_points',
    'threshold_35_points',
    'threshold_40_points',
    'admin_referral'
  )),
  case_type TEXT DEFAULT 'standard' CHECK (case_type IN ('standard', 'lite', 'intensive')),
  domain_focus_id INTEGER REFERENCES behavioral_domains(id),

  -- Step 1: Stabilize (handled by trigger)

  -- Step 2: Context Packet
  incident_summary TEXT,
  pattern_review TEXT,
  environmental_factors JSONB DEFAULT '[]'::jsonb,
  prior_interventions_summary TEXT,
  context_packet_completed BOOLEAN DEFAULT FALSE,

  -- Step 3: Admin Response
  admin_response_type TEXT CHECK (admin_response_type IN (
    'detention',
    'iss',
    'oss',
    'behavior_contract',
    'parent_conference',
    'other'
  )),
  admin_response_details TEXT,
  consequence_start_date DATE,
  consequence_end_date DATE,
  admin_response_completed BOOLEAN DEFAULT FALSE,

  -- Step 4: Re-entry Planning & Student Support Plan
  support_plan_goal TEXT,
  support_plan_strategies JSONB DEFAULT '[]'::jsonb,
  adult_mentor_id UUID REFERENCES auth.users(id),
  adult_mentor_name TEXT,
  repair_actions JSONB DEFAULT '[]'::jsonb,
  reentry_date DATE,
  reentry_type TEXT DEFAULT 'standard' CHECK (reentry_type IN ('standard', 'restricted')),
  reentry_restrictions JSONB DEFAULT '[]'::jsonb,
  reentry_checklist JSONB DEFAULT '[]'::jsonb,
  reentry_planning_completed BOOLEAN DEFAULT FALSE,

  -- Step 5: Monitor & Close
  monitoring_duration_days INTEGER DEFAULT 10,
  monitoring_schedule JSONB DEFAULT '[]'::jsonb,
  review_dates JSONB DEFAULT '[]'::jsonb,
  daily_check_ins JSONB DEFAULT '[]'::jsonb,

  -- Closure
  closure_criteria TEXT,
  closure_date DATE,
  outcome_status TEXT CHECK (outcome_status IN (
    'closed_success',
    'closed_continued_support',
    'closed_escalated',
    'active'
  )),
  outcome_notes TEXT,

  -- Related Level B interventions
  escalated_from_level_b_ids UUID[] DEFAULT '{}',

  -- SIS Threshold Tracking (manual entry from SIS)
  sis_demerit_points_at_creation INTEGER,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active',
    'context_packet',
    'admin_response',
    'pending_reentry',
    'monitoring',
    'closed'
  )),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: reentry_protocols
-- Purpose: Track re-entry for all consequence types
-- ============================================================================
CREATE TABLE IF NOT EXISTS reentry_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,

  -- Source Reference
  source_type TEXT NOT NULL CHECK (source_type IN (
    'level_b',
    'detention',
    'iss',
    'oss'
  )),
  level_b_id UUID REFERENCES level_b_interventions(id),
  level_c_id UUID REFERENCES level_c_cases(id),

  -- Re-entry Configuration
  reentry_date DATE NOT NULL,
  reentry_time TIME,
  receiving_teacher_id UUID REFERENCES auth.users(id),
  receiving_teacher_name TEXT,

  -- 4-Point Readiness Checklist
  readiness_checklist JSONB DEFAULT '[
    {"item": "Student can articulate what happened", "completed": false},
    {"item": "Student can name the expectation broken", "completed": false},
    {"item": "Student has identified repair action", "completed": false},
    {"item": "Student can state reset goal", "completed": false}
  ]'::jsonb,
  readiness_verified_by UUID REFERENCES auth.users(id),
  readiness_verified_at TIMESTAMPTZ,

  -- Teacher Script
  teacher_script TEXT,
  reset_goal_from_intervention TEXT,
  first_behavioral_rep_completed BOOLEAN DEFAULT FALSE,

  -- Monitoring Period
  monitoring_start_date DATE,
  monitoring_end_date DATE,
  monitoring_type TEXT CHECK (monitoring_type IN ('3_day', '5_day', '10_day')),
  monitoring_method TEXT CHECK (monitoring_method IN ('checklist', 'check_in_out', 'intensive')),

  -- Daily Logs
  daily_logs JSONB DEFAULT '[]'::jsonb,

  -- Outcome
  outcome TEXT CHECK (outcome IN ('success', 'partial', 'escalated')),
  outcome_notes TEXT,
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'active', 'completed')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: student_intervention_thresholds
-- Purpose: Configurable thresholds for SIS demerit-based interventions
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_intervention_thresholds (
  id SERIAL PRIMARY KEY,
  threshold_name TEXT NOT NULL UNIQUE,
  description TEXT,
  demerit_points INTEGER NOT NULL,
  intervention_level TEXT NOT NULL CHECK (intervention_level IN (
    'level_b',
    'level_c_lite',
    'level_c',
    'level_c_reentry',
    'admin_decision'
  )),
  intervention_duration_days INTEGER,
  additional_supports JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default thresholds based on DAAIS framework
INSERT INTO student_intervention_thresholds
  (threshold_name, description, demerit_points, intervention_level, intervention_duration_days, additional_supports)
VALUES
  ('10_point_threshold', '3-day Level B + daily checkmarks', 10, 'level_b', 3,
   '{"daily_checkmarks": true}'::jsonb),
  ('20_point_threshold', '2-week Level C-lite with check-in/out + 2 supports', 20, 'level_c_lite', 14,
   '{"check_in_out": true, "additional_supports_count": 2}'::jsonb),
  ('30_point_threshold', 'Formal Level C with Student Support Plan', 30, 'level_c', 28,
   '{"support_plan_required": true}'::jsonb),
  ('35_point_threshold', 'Mandatory Level C re-entry + 10-day monitoring', 35, 'level_c_reentry', 10,
   '{"mandatory_reentry": true, "intensive_monitoring": true}'::jsonb),
  ('40_point_threshold', 'Administrative decision with intensive supports', 40, 'admin_decision', 0,
   '{"admin_decision_required": true, "intensive_supports": true}'::jsonb)
ON CONFLICT (threshold_name) DO NOTHING;

-- ============================================================================
-- TABLE: intervention_analytics
-- Purpose: Daily/weekly snapshots of intervention metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS intervention_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT DEFAULT 'daily' CHECK (snapshot_type IN ('daily', 'weekly', 'monthly')),

  -- Level Distribution
  level_a_count INTEGER DEFAULT 0,
  level_b_count INTEGER DEFAULT 0,
  level_c_count INTEGER DEFAULT 0,

  -- Repeat Rates by Domain
  repeat_rate_prayer_space DECIMAL(5,2),
  repeat_rate_hallways DECIMAL(5,2),
  repeat_rate_lunch_recess DECIMAL(5,2),
  repeat_rate_respect DECIMAL(5,2),
  repeat_rate_overall DECIMAL(5,2),

  -- Escalation Metrics
  a_to_b_escalation_rate DECIMAL(5,2),
  b_to_c_escalation_rate DECIMAL(5,2),

  -- Goal Achievement
  level_b_completion_rate DECIMAL(5,2),
  goal_achievement_rate DECIMAL(5,2),

  -- Staff Consistency
  staff_variance_index DECIMAL(5,2),

  -- Hot Zones (location/time analysis)
  hot_zones JSONB DEFAULT '{}'::jsonb,

  -- Quality Benchmarks
  quality_score INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, snapshot_type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Level A Indexes
CREATE INDEX IF NOT EXISTS idx_level_a_student ON level_a_interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_level_a_domain ON level_a_interventions(domain_id);
CREATE INDEX IF NOT EXISTS idx_level_a_staff ON level_a_interventions(staff_id);
CREATE INDEX IF NOT EXISTS idx_level_a_timestamp ON level_a_interventions(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_level_a_escalated ON level_a_interventions(escalated_to_b) WHERE escalated_to_b = TRUE;
-- Note: Removed DATE() index as it's not IMMUTABLE. Query by event_timestamp range instead.

-- Level B Indexes
CREATE INDEX IF NOT EXISTS idx_level_b_student ON level_b_interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_level_b_status ON level_b_interventions(status);
CREATE INDEX IF NOT EXISTS idx_level_b_domain ON level_b_interventions(domain_id);
CREATE INDEX IF NOT EXISTS idx_level_b_monitoring ON level_b_interventions(monitoring_end_date)
  WHERE status IN ('in_progress', 'monitoring');
CREATE INDEX IF NOT EXISTS idx_level_b_created ON level_b_interventions(created_at DESC);

-- Level C Indexes
CREATE INDEX IF NOT EXISTS idx_level_c_student ON level_c_cases(student_id);
CREATE INDEX IF NOT EXISTS idx_level_c_status ON level_c_cases(status);
CREATE INDEX IF NOT EXISTS idx_level_c_case_manager ON level_c_cases(case_manager_id);
CREATE INDEX IF NOT EXISTS idx_level_c_reentry ON level_c_cases(reentry_date) WHERE status = 'pending_reentry';
CREATE INDEX IF NOT EXISTS idx_level_c_created ON level_c_cases(created_at DESC);

-- Re-entry Indexes
CREATE INDEX IF NOT EXISTS idx_reentry_student ON reentry_protocols(student_id);
CREATE INDEX IF NOT EXISTS idx_reentry_date ON reentry_protocols(reentry_date);
CREATE INDEX IF NOT EXISTS idx_reentry_status ON reentry_protocols(status);

-- Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_intervention_analytics_date ON intervention_analytics(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_intervention_analytics_type ON intervention_analytics(snapshot_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE behavioral_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_a_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_b_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_c_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reentry_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_intervention_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_analytics ENABLE ROW LEVEL SECURITY;

-- Behavioral Domains: Everyone can read
CREATE POLICY "Anyone can view behavioral_domains" ON behavioral_domains
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage behavioral_domains" ON behavioral_domains
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin')
    )
  );

-- Level A: Staff can create, elevated can view all
CREATE POLICY "Staff can create level_a_interventions" ON level_a_interventions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can view level_a_interventions" ON level_a_interventions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can update own level_a_interventions" ON level_a_interventions
  FOR UPDATE TO authenticated
  USING (staff_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
  ));

-- Level B: Staff can create/manage, elevated can view all
CREATE POLICY "Staff can create level_b_interventions" ON level_b_interventions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can view level_b_interventions" ON level_b_interventions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can update level_b_interventions" ON level_b_interventions
  FOR UPDATE TO authenticated USING (true);

-- Level C: Case managers and admins only
CREATE POLICY "Elevated roles can manage level_c_cases" ON level_c_cases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin')
    )
    OR case_manager_id = auth.uid()
  );

CREATE POLICY "Staff can view level_c_cases" ON level_c_cases
  FOR SELECT TO authenticated USING (true);

-- Re-entry: Staff involved can manage
CREATE POLICY "Staff can manage reentry_protocols" ON reentry_protocols
  FOR ALL TO authenticated USING (true);

-- Thresholds: Admins only for management, all can view
CREATE POLICY "Anyone can view thresholds" ON student_intervention_thresholds
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage thresholds" ON student_intervention_thresholds
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin')
    )
  );

-- Analytics: Elevated roles can view
CREATE POLICY "Elevated can view intervention_analytics" ON intervention_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin', 'staff')
    )
  );

CREATE POLICY "Service can manage intervention_analytics" ON intervention_analytics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin')
    )
  );

-- ============================================================================
-- SERVICE ROLE GRANTS
-- ============================================================================

GRANT ALL ON behavioral_domains TO service_role;
GRANT ALL ON level_a_interventions TO service_role;
GRANT ALL ON level_b_interventions TO service_role;
GRANT ALL ON level_c_cases TO service_role;
GRANT ALL ON reentry_protocols TO service_role;
GRANT ALL ON student_intervention_thresholds TO service_role;
GRANT ALL ON intervention_analytics TO service_role;
GRANT USAGE, SELECT ON SEQUENCE behavioral_domains_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE student_intervention_thresholds_id_seq TO service_role;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if student has pattern in domain (3+ incidents in 10 days)
CREATE OR REPLACE FUNCTION check_student_domain_pattern(
  p_student_id UUID,
  p_domain_id INTEGER,
  p_days INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
  incident_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO incident_count
  FROM level_a_interventions
  WHERE student_id = p_student_id
    AND domain_id = p_domain_id
    AND event_timestamp >= NOW() - (p_days || ' days')::INTERVAL;

  RETURN incident_count >= 3;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to count Level B attempts for student in domain
CREATE OR REPLACE FUNCTION count_level_b_attempts(
  p_student_id UUID,
  p_domain_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM level_b_interventions
  WHERE student_id = p_student_id
    AND domain_id = p_domain_id
    AND status IN ('completed_success', 'completed_escalated');

  RETURN attempt_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to determine intervention level based on decision tree
CREATE OR REPLACE FUNCTION determine_intervention_level(
  p_student_id UUID,
  p_domain_id INTEGER,
  p_is_safety_incident BOOLEAN DEFAULT FALSE,
  p_demerit_assigned BOOLEAN DEFAULT FALSE,
  p_ignored_prompts INTEGER DEFAULT 0,
  p_affected_peers BOOLEAN DEFAULT FALSE,
  p_disrupted_space BOOLEAN DEFAULT FALSE,
  p_is_safety_risk BOOLEAN DEFAULT FALSE
)
RETURNS TEXT AS $$
DECLARE
  is_pattern BOOLEAN;
  level_b_count INTEGER;
  has_escalation_trigger BOOLEAN;
BEGIN
  -- Step 1: Safety/Major Harm check
  IF p_is_safety_incident THEN
    RETURN 'C';
  END IF;

  -- Step 2: Check escalation triggers
  is_pattern := check_student_domain_pattern(p_student_id, p_domain_id);

  has_escalation_trigger := p_demerit_assigned
    OR p_ignored_prompts >= 2
    OR is_pattern
    OR p_affected_peers
    OR p_disrupted_space
    OR p_is_safety_risk;

  IF has_escalation_trigger THEN
    -- Step 3: Check if 2 Level B cycles already attempted
    level_b_count := count_level_b_attempts(p_student_id, p_domain_id);
    IF level_b_count >= 2 THEN
      RETURN 'C';
    END IF;
    RETURN 'B';
  END IF;

  RETURN 'A';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_level_b_updated_at
  BEFORE UPDATE ON level_b_interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_level_c_updated_at
  BEFORE UPDATE ON level_c_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reentry_updated_at
  BEFORE UPDATE ON reentry_protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'A/B/C Intervention Framework tables created successfully' AS status;
