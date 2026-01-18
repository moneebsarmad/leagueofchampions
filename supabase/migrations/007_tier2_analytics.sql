-- ============================================================================
-- LEAGUE OF CHAMPIONS - TIER 2 ANALYTICS TABLES (MIGRATION 007)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- TABLE: analytics_snapshots
-- Purpose: Store daily/weekly computed metrics for trend analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'

  -- Staff Participation Metrics
  staff_participation_rate DECIMAL(5,2), -- Percentage of staff who gave points
  active_staff_count INTEGER,
  total_staff_count INTEGER,

  -- Point Economy Metrics
  points_per_student_avg DECIMAL(8,2),
  points_per_staff_avg DECIMAL(8,2),
  total_points_awarded INTEGER,
  total_transactions INTEGER,

  -- Category Balance (3Rs)
  category_respect_pct DECIMAL(5,2),
  category_responsibility_pct DECIMAL(5,2),
  category_righteousness_pct DECIMAL(5,2),
  category_other_pct DECIMAL(5,2),

  -- House Balance
  house_balance_variance DECIMAL(5,2), -- Coefficient of variation across houses
  house_points JSONB, -- {"house_name": points, ...}

  -- Composite Scores
  overall_health_score INTEGER, -- 1-100 scale
  status TEXT CHECK (status IN ('GREEN', 'AMBER', 'RED')),

  -- Component Scores (for drill-down)
  participation_score INTEGER, -- 1-100
  category_balance_score INTEGER, -- 1-100
  house_balance_score INTEGER, -- 1-100
  consistency_score INTEGER, -- 1-100

  -- Week-over-week changes
  participation_change DECIMAL(5,2), -- Percentage change from previous period
  points_change DECIMAL(5,2),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint to prevent duplicate snapshots
  UNIQUE(snapshot_date, snapshot_type)
);

-- Indexes for analytics_snapshots
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_type ON analytics_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_status ON analytics_snapshots(status);

-- ============================================================================
-- TABLE: staff_analytics
-- Purpose: Individual staff analysis with participation and bias metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID, -- References staff table if exists, nullable for flexibility
  staff_email TEXT NOT NULL,
  staff_name TEXT,
  analysis_date DATE NOT NULL,
  analysis_period TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'

  -- Participation Metrics
  points_given_period INTEGER DEFAULT 0,
  points_given_total INTEGER DEFAULT 0,
  active_days_period INTEGER DEFAULT 0,
  participation_streak_days INTEGER DEFAULT 0,
  days_since_last_point INTEGER,

  -- Category Preferences
  favorite_category TEXT,
  category_distribution JSONB, -- {"Respect": 30, "Responsibility": 40, ...}

  -- House Bias Detection
  house_bias_coefficient DECIMAL(8,4), -- Chi-square based
  house_distribution JSONB, -- {"House A": 25, "House B": 30, ...}
  favored_house TEXT,

  -- Outlier Detection
  outlier_flag BOOLEAN DEFAULT FALSE,
  outlier_reason TEXT,
  z_score DECIMAL(8,4), -- Standard deviations from mean

  -- Averages for Comparison
  school_avg_points DECIMAL(8,2),
  department_avg_points DECIMAL(8,2),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(staff_email, analysis_date, analysis_period)
);

-- Indexes for staff_analytics
CREATE INDEX IF NOT EXISTS idx_staff_analytics_email ON staff_analytics(staff_email);
CREATE INDEX IF NOT EXISTS idx_staff_analytics_date ON staff_analytics(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_analytics_outlier ON staff_analytics(outlier_flag) WHERE outlier_flag = TRUE;
CREATE INDEX IF NOT EXISTS idx_staff_analytics_period ON staff_analytics(analysis_period);

-- ============================================================================
-- TABLE: alert_history
-- Purpose: Track system alerts with severity, status, and resolution
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert Classification
  alert_type TEXT NOT NULL, -- 'LOW_PARTICIPATION', 'INFLATION', 'BIAS', 'CATEGORY_DRIFT', 'HOUSE_IMBALANCE', 'OUTLIER_BEHAVIOR'
  severity TEXT NOT NULL CHECK (severity IN ('AMBER', 'RED')),

  -- Alert Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recommended_action TEXT,

  -- Related Data
  triggered_by_data JSONB, -- Store the metrics that triggered this alert
  related_staff_email TEXT, -- If alert is about specific staff
  related_metric TEXT, -- Which metric triggered (e.g., 'participation_rate')
  metric_value DECIMAL(10,4), -- The value that triggered the alert
  threshold_value DECIMAL(10,4), -- The threshold that was crossed

  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,

  -- Intervention Link
  intervention_id UUID, -- Will reference intervention_logs if intervention was taken

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for alert_history
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status);
CREATE INDEX IF NOT EXISTS idx_alert_history_type ON alert_history(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_created ON alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_active ON alert_history(status) WHERE status = 'ACTIVE';

-- ============================================================================
-- TABLE: intervention_logs
-- Purpose: Track playbook-based interventions and their outcomes
-- ============================================================================
CREATE TABLE IF NOT EXISTS intervention_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert Reference
  alert_id UUID REFERENCES alert_history(id),

  -- Intervention Details
  intervention_type TEXT NOT NULL, -- 'EMAIL_REMINDER', 'TRAINING_SESSION', 'INDIVIDUAL_COACHING', 'CALIBRATION_MEETING', 'SYSTEM_CONFIG'
  playbook_used TEXT, -- Name of the playbook template used

  -- Actions Taken
  actions_taken JSONB, -- Array of action items completed
  actions_summary TEXT,

  -- Recipients/Targets
  target_staff_emails TEXT[], -- Staff members targeted
  target_departments TEXT[], -- Departments targeted

  -- Scheduling
  scheduled_date DATE,
  completed_date DATE,

  -- Outcome Tracking
  outcome_notes TEXT,
  effectiveness_score INTEGER CHECK (effectiveness_score >= 1 AND effectiveness_score <= 10),
  metrics_before JSONB, -- Snapshot of metrics before intervention
  metrics_after JSONB, -- Snapshot of metrics after follow-up period

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for intervention_logs
CREATE INDEX IF NOT EXISTS idx_intervention_logs_alert ON intervention_logs(alert_id);
CREATE INDEX IF NOT EXISTS idx_intervention_logs_type ON intervention_logs(intervention_type);
CREATE INDEX IF NOT EXISTS idx_intervention_logs_status ON intervention_logs(status);
CREATE INDEX IF NOT EXISTS idx_intervention_logs_created ON intervention_logs(created_at DESC);

-- ============================================================================
-- TABLE: report_templates
-- Purpose: Store customizable report templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template Identity
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('WEEKLY_DIGEST', 'QUARTERLY_BOARD', 'STAFF_SUMMARY', 'CUSTOM')),
  description TEXT,

  -- Template Configuration
  template_config JSONB NOT NULL DEFAULT '{}', -- Store report structure, sections, formatting

  -- Scheduling
  is_scheduled BOOLEAN DEFAULT FALSE,
  schedule_cron TEXT, -- Cron expression for scheduling
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,

  -- Recipients
  recipients JSONB, -- Array of email addresses or role-based recipients

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for report_templates
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_report_templates_scheduled ON report_templates(is_scheduled) WHERE is_scheduled = TRUE;

-- ============================================================================
-- TABLE: report_history
-- Purpose: Track generated reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report Identity
  template_id UUID REFERENCES report_templates(id),
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,

  -- Time Period
  period_start DATE,
  period_end DATE,

  -- Content
  report_data JSONB, -- The computed report data
  report_url TEXT, -- URL to stored PDF if applicable

  -- Distribution
  recipients_sent TEXT[], -- Emails the report was sent to
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for report_history
CREATE INDEX IF NOT EXISTS idx_report_history_type ON report_history(report_type);
CREATE INDEX IF NOT EXISTS idx_report_history_generated ON report_history(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_history_template ON report_history(template_id);

-- ============================================================================
-- TABLE: alert_thresholds
-- Purpose: Configurable thresholds for alert triggering
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Threshold Identity
  metric_name TEXT NOT NULL UNIQUE, -- 'participation_rate', 'category_imbalance', 'house_variance', etc.
  display_name TEXT NOT NULL,
  description TEXT,

  -- Threshold Values
  amber_threshold DECIMAL(10,4), -- Value that triggers AMBER alert
  red_threshold DECIMAL(10,4), -- Value that triggers RED alert
  comparison_operator TEXT DEFAULT 'lt' CHECK (comparison_operator IN ('lt', 'lte', 'gt', 'gte', 'eq')),

  -- Configuration
  is_enabled BOOLEAN DEFAULT TRUE,
  consecutive_periods INTEGER DEFAULT 1, -- Number of periods threshold must be crossed

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default thresholds
INSERT INTO alert_thresholds (metric_name, display_name, description, amber_threshold, red_threshold, comparison_operator, consecutive_periods)
VALUES
  ('participation_rate', 'Staff Participation Rate', 'Percentage of staff who have given points', 70, 50, 'lt', 1),
  ('category_imbalance', 'Category Imbalance', 'Single category exceeds this percentage', 50, 60, 'gt', 2),
  ('house_variance', 'House Point Variance', 'Coefficient of variation across houses', 25, 35, 'gt', 2),
  ('days_since_point', 'Days Since Last Point', 'Staff inactive for this many days', 5, 10, 'gt', 1),
  ('inflation_index', 'Point Inflation Index', 'Current vs baseline points ratio', 1.5, 2.0, 'gt', 2),
  ('staff_outlier_zscore', 'Staff Outlier Z-Score', 'Standard deviations from mean', 2.0, 3.0, 'gt', 1),
  ('weekly_participation_drop', 'Weekly Participation Drop', 'Week-over-week participation decline', 10, 20, 'gt', 1)
ON CONFLICT (metric_name) DO NOTHING;

-- ============================================================================
-- TABLE: intervention_playbooks
-- Purpose: Define intervention templates/playbooks
-- ============================================================================
CREATE TABLE IF NOT EXISTS intervention_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Playbook Identity
  playbook_name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Trigger Conditions
  trigger_alert_types TEXT[], -- Which alert types this playbook addresses
  trigger_severity TEXT[], -- Which severity levels

  -- Actions
  actions JSONB NOT NULL, -- Array of action items
  -- Example: [{"step": 1, "action": "Send reminder email", "template": "engagement_reminder"}, ...]

  -- Follow-up
  follow_up_period_days INTEGER DEFAULT 7,
  success_metrics JSONB, -- Metrics to check for success

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default playbooks
INSERT INTO intervention_playbooks (playbook_name, description, trigger_alert_types, trigger_severity, actions, follow_up_period_days, success_metrics)
VALUES
  (
    'Low Participation Response',
    'Re-engage staff when participation drops below threshold',
    ARRAY['LOW_PARTICIPATION'],
    ARRAY['AMBER', 'RED'],
    '[
      {"step": 1, "action": "Send participation reminder email to inactive staff", "template": "participation_reminder"},
      {"step": 2, "action": "Schedule department head check-in meetings", "template": null},
      {"step": 3, "action": "Review and address any technical barriers", "template": null},
      {"step": 4, "action": "Consider brief refresher training session", "template": null}
    ]'::jsonb,
    7,
    '{"participation_rate": {"operator": "gte", "value": 75}}'::jsonb
  ),
  (
    'Category Imbalance Correction',
    'Address when single category dominates point distribution',
    ARRAY['CATEGORY_DRIFT'],
    ARRAY['AMBER', 'RED'],
    '[
      {"step": 1, "action": "Send category balance awareness email", "template": "category_balance"},
      {"step": 2, "action": "Share behavior examples for underused categories", "template": null},
      {"step": 3, "action": "Schedule mini calibration session at next staff meeting", "template": null},
      {"step": 4, "action": "Update point-giving quick reference guide", "template": null}
    ]'::jsonb,
    14,
    '{"max_category_pct": {"operator": "lte", "value": 50}}'::jsonb
  ),
  (
    'House Imbalance Investigation',
    'Investigate and address house point distribution issues',
    ARRAY['HOUSE_IMBALANCE', 'BIAS'],
    ARRAY['AMBER', 'RED'],
    '[
      {"step": 1, "action": "Review house distribution data by staff", "template": null},
      {"step": 2, "action": "Check for structural issues (class assignments, etc.)", "template": null},
      {"step": 3, "action": "Discuss findings with house mentors", "template": null},
      {"step": 4, "action": "Implement corrective actions if bias confirmed", "template": null}
    ]'::jsonb,
    14,
    '{"house_variance": {"operator": "lte", "value": 25}}'::jsonb
  ),
  (
    'Individual Staff Coaching',
    'Address outlier staff behavior patterns',
    ARRAY['OUTLIER_BEHAVIOR'],
    ARRAY['AMBER', 'RED'],
    '[
      {"step": 1, "action": "Review individual staff metrics in detail", "template": null},
      {"step": 2, "action": "Schedule private conversation with staff member", "template": null},
      {"step": 3, "action": "Provide specific feedback and guidance", "template": null},
      {"step": 4, "action": "Set follow-up check-in date", "template": null}
    ]'::jsonb,
    7,
    '{"outlier_flag": {"operator": "eq", "value": false}}'::jsonb
  )
ON CONFLICT (playbook_name) DO NOTHING;

-- ============================================================================
-- TABLE: email_templates
-- Purpose: Store email templates for automated communications
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template Identity
  template_key TEXT NOT NULL UNIQUE, -- 'weekly_digest', 'alert_notification', etc.
  template_name TEXT NOT NULL,
  description TEXT,

  -- Content
  subject_template TEXT NOT NULL, -- Supports {{variable}} placeholders
  body_html_template TEXT NOT NULL, -- HTML template with {{variable}} placeholders
  body_text_template TEXT, -- Plain text fallback

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (template_key, template_name, description, subject_template, body_html_template, body_text_template)
VALUES
  (
    'weekly_digest',
    'Weekly Implementation Digest',
    'Friday summary email sent to leadership',
    'LOC Weekly Digest - Week of {{week_start}}',
    '<html><body>
      <h1>League of Champions Weekly Digest</h1>
      <p>Week of {{week_start}} to {{week_end}}</p>

      <h2>Health Status: {{health_status}}</h2>
      <p>Overall Score: {{health_score}}/100</p>

      <h2>Key Metrics</h2>
      <ul>
        <li>Staff Participation: {{participation_rate}}%</li>
        <li>Points Awarded: {{total_points}}</li>
        <li>Active Staff: {{active_staff}}/{{total_staff}}</li>
      </ul>

      <h2>Insights</h2>
      {{#insights}}
      <p>• {{.}}</p>
      {{/insights}}

      <h2>Recommended Actions</h2>
      {{#actions}}
      <p>• {{.}}</p>
      {{/actions}}

      <p><a href="{{dashboard_url}}">View Full Dashboard</a></p>
    </body></html>',
    'League of Champions Weekly Digest\nWeek of {{week_start}} to {{week_end}}\n\nHealth Status: {{health_status}} ({{health_score}}/100)\n\nKey Metrics:\n- Staff Participation: {{participation_rate}}%\n- Points Awarded: {{total_points}}\n- Active Staff: {{active_staff}}/{{total_staff}}'
  ),
  (
    'alert_notification',
    'System Alert Notification',
    'Immediate notification for critical alerts',
    'LOC Alert: {{alert_title}}',
    '<html><body>
      <h1 style="color: {{severity_color}};">{{severity}} Alert</h1>
      <h2>{{alert_title}}</h2>
      <p>{{alert_message}}</p>

      <h3>Details</h3>
      <p>Metric: {{metric_name}}</p>
      <p>Current Value: {{metric_value}}</p>
      <p>Threshold: {{threshold_value}}</p>

      <h3>Recommended Action</h3>
      <p>{{recommended_action}}</p>

      <p><a href="{{alert_url}}">View Alert Details</a></p>
    </body></html>',
    'LOC {{severity}} Alert: {{alert_title}}\n\n{{alert_message}}\n\nMetric: {{metric_name}}\nValue: {{metric_value}} (Threshold: {{threshold_value}})\n\nRecommended: {{recommended_action}}'
  ),
  (
    'participation_reminder',
    'Staff Participation Reminder',
    'Gentle reminder for inactive staff',
    'Quick Reminder: League of Champions Participation',
    '<html><body>
      <h1>League of Champions</h1>
      <p>Hi {{staff_name}},</p>

      <p>We noticed it''s been {{days_inactive}} days since you last recognized a student in the League of Champions system.</p>

      <p>Remember, even a quick point for a student showing Respect, Responsibility, or Righteousness can make their day!</p>

      <h3>Quick Tips:</h3>
      <ul>
        <li>Look for students following directions promptly (Respect)</li>
        <li>Recognize students who come prepared (Responsibility)</li>
        <li>Celebrate honest moments and helping others (Righteousness)</li>
      </ul>

      <p><a href="{{portal_url}}">Give a Point Now</a></p>

      <p>Thank you for building our school culture!</p>
    </body></html>',
    'Hi {{staff_name}},\n\nIt''s been {{days_inactive}} days since you last recognized a student in League of Champions.\n\nQuick reminder to look for students showing Respect, Responsibility, or Righteousness today!\n\nGive a point: {{portal_url}}'
  ),
  (
    'category_balance',
    'Category Balance Reminder',
    'Reminder about balanced category usage',
    'LOC Tip: Balancing the 3Rs',
    '<html><body>
      <h1>League of Champions</h1>
      <p>Hi Team,</p>

      <p>Our recent data shows our point distribution is weighted heavily toward <strong>{{dominant_category}}</strong> ({{dominant_pct}}% of points).</p>

      <p>To maintain a balanced culture focus, consider looking for opportunities to recognize:</p>

      {{#underused_categories}}
      <h3>{{name}} (currently {{pct}}%)</h3>
      <p>Examples: {{examples}}</p>
      {{/underused_categories}}

      <p>A balanced approach helps students develop all three character traits!</p>
    </body></html>',
    'Hi Team,\n\nOur points are heavily weighted toward {{dominant_category}} ({{dominant_pct}}%).\n\nPlease look for opportunities to recognize other categories to maintain balance.'
  ),
  (
    'quarterly_board_report',
    'Quarterly Board Report',
    'Formal report for board presentations',
    'LOC Quarterly Report - {{quarter}} {{year}}',
    '<html><body>
      <h1>League of Champions</h1>
      <h2>Quarterly Implementation Report</h2>
      <h3>{{quarter}} {{year}}</h3>

      <h2>Executive Summary</h2>
      <p>{{executive_summary}}</p>

      <h2>Key Performance Indicators</h2>
      <table>
        <tr><th>Metric</th><th>This Quarter</th><th>Last Quarter</th><th>Change</th></tr>
        {{#kpis}}
        <tr><td>{{name}}</td><td>{{current}}</td><td>{{previous}}</td><td>{{change}}</td></tr>
        {{/kpis}}
      </table>

      <h2>Highlights</h2>
      {{#highlights}}
      <p>• {{.}}</p>
      {{/highlights}}

      <h2>Challenges & Actions Taken</h2>
      {{#challenges}}
      <p>• {{.}}</p>
      {{/challenges}}

      <h2>Next Quarter Focus</h2>
      {{#next_quarter}}
      <p>• {{.}}</p>
      {{/next_quarter}}
    </body></html>',
    'League of Champions Quarterly Report - {{quarter}} {{year}}\n\nExecutive Summary:\n{{executive_summary}}'
  )
ON CONFLICT (template_key) DO NOTHING;

-- ============================================================================
-- TABLE: email_queue
-- Purpose: Queue for outgoing emails
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email Details
  template_key TEXT REFERENCES email_templates(template_key),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

  -- Content (populated from template)
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,

  -- Template Variables (for logging/debugging)
  template_variables JSONB,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'FAILED')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for email_queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'PENDING';

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Analytics Snapshots: Admins and elevated roles can read
CREATE POLICY "Elevated roles can view analytics_snapshots" ON analytics_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'house_mentor')
    )
  );

-- Staff Analytics: Admins can view all, staff can view their own
CREATE POLICY "Admins can view all staff_analytics" ON staff_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
    OR staff_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Alert History: Elevated roles can view and manage
CREATE POLICY "Elevated roles can view alert_history" ON alert_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'house_mentor')
    )
  );

CREATE POLICY "Elevated roles can update alert_history" ON alert_history
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Intervention Logs: Admins only
CREATE POLICY "Admins can manage intervention_logs" ON intervention_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Report Templates: Admins can manage, elevated can view
CREATE POLICY "Elevated roles can view report_templates" ON report_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'house_mentor')
    )
  );

CREATE POLICY "Admins can manage report_templates" ON report_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Report History: Same as templates
CREATE POLICY "Elevated roles can view report_history" ON report_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'house_mentor')
    )
  );

-- Alert Thresholds: Admins can manage, elevated can view
CREATE POLICY "Elevated roles can view alert_thresholds" ON alert_thresholds
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'house_mentor')
    )
  );

CREATE POLICY "Admins can manage alert_thresholds" ON alert_thresholds
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Intervention Playbooks: Same pattern
CREATE POLICY "Elevated roles can view intervention_playbooks" ON intervention_playbooks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'house_mentor')
    )
  );

CREATE POLICY "Admins can manage intervention_playbooks" ON intervention_playbooks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Email Templates: Admins only
CREATE POLICY "Admins can manage email_templates" ON email_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Email Queue: Admins only
CREATE POLICY "Admins can manage email_queue" ON email_queue
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- ============================================================================
-- SERVICE ROLE GRANTS
-- ============================================================================
GRANT ALL ON analytics_snapshots TO service_role;
GRANT ALL ON staff_analytics TO service_role;
GRANT ALL ON alert_history TO service_role;
GRANT ALL ON intervention_logs TO service_role;
GRANT ALL ON report_templates TO service_role;
GRANT ALL ON report_history TO service_role;
GRANT ALL ON alert_thresholds TO service_role;
GRANT ALL ON intervention_playbooks TO service_role;
GRANT ALL ON email_templates TO service_role;
GRANT ALL ON email_queue TO service_role;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate health status from score
CREATE OR REPLACE FUNCTION get_health_status(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF score >= 80 THEN
    RETURN 'GREEN';
  ELSIF score >= 60 THEN
    RETURN 'AMBER';
  ELSE
    RETURN 'RED';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if alert should be triggered
CREATE OR REPLACE FUNCTION should_trigger_alert(
  metric_name_param TEXT,
  metric_value_param DECIMAL
)
RETURNS TABLE(should_trigger BOOLEAN, severity TEXT, threshold_value DECIMAL) AS $$
DECLARE
  threshold RECORD;
BEGIN
  SELECT * INTO threshold FROM alert_thresholds WHERE metric_name = metric_name_param AND is_enabled = TRUE;

  IF threshold IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Check RED threshold first
  IF (threshold.comparison_operator = 'lt' AND metric_value_param < threshold.red_threshold)
     OR (threshold.comparison_operator = 'lte' AND metric_value_param <= threshold.red_threshold)
     OR (threshold.comparison_operator = 'gt' AND metric_value_param > threshold.red_threshold)
     OR (threshold.comparison_operator = 'gte' AND metric_value_param >= threshold.red_threshold)
  THEN
    RETURN QUERY SELECT TRUE, 'RED'::TEXT, threshold.red_threshold;
    RETURN;
  END IF;

  -- Check AMBER threshold
  IF (threshold.comparison_operator = 'lt' AND metric_value_param < threshold.amber_threshold)
     OR (threshold.comparison_operator = 'lte' AND metric_value_param <= threshold.amber_threshold)
     OR (threshold.comparison_operator = 'gt' AND metric_value_param > threshold.amber_threshold)
     OR (threshold.comparison_operator = 'gte' AND metric_value_param >= threshold.amber_threshold)
  THEN
    RETURN QUERY SELECT TRUE, 'AMBER'::TEXT, threshold.amber_threshold;
    RETURN;
  END IF;

  RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::DECIMAL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Tier 2 Analytics tables created successfully' AS status;
