# League of Champions - Complete System Documentation

> **Purpose**: This document contains everything needed to recreate the Portal and Leaderboard applications from scratch. It includes all UI features, backend services, API routes, database schema, and technical specifications.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Portal App - Complete Specification](#5-portal-app---complete-specification)
6. [Leaderboard App - Complete Specification](#6-leaderboard-app---complete-specification)
7. [API Routes Reference](#7-api-routes-reference)
8. [Backend Services](#8-backend-services)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [School Configuration](#10-school-configuration)
11. [Environment Variables](#11-environment-variables)
12. [Deployment Configuration](#12-deployment-configuration)

---

## 1. System Overview

League of Champions is an Islamic school gamification platform that tracks student merit points across a house system. The platform consists of two main applications:

### Portal App
Admin dashboard for managing the merit system including:
- Student and staff management
- Points awarding (3R System: Respect, Responsibility, Righteousness)
- Behavioral analytics and insights
- Staff engagement tracking
- Alert monitoring and interventions
- Report generation
- Parent portal functionality

### Leaderboard App
Public-facing display showing:
- Real-time house standings
- Hall of Fame (achievement tiers)
- House MVPs (top students per house)
- Auto-rotating display for school screens

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.x | React framework with App Router |
| React | 19.2.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Recharts | 3.6.0 | Data visualization (Portal only) |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | 2.89.0 | Database, Auth, Real-time |
| Supabase SSR | 0.8.0 | Server-side auth (Portal only) |
| PostgreSQL | - | Database (via Supabase) |

### Testing (Portal)
| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 3.2.4 | Unit testing |
| Playwright | 1.55.0 | E2E testing |
| Testing Library | 16.3.0 | React testing utilities |

---

## 3. Project Structure

```
leagueofchampions/
├── apps/
│   ├── portal/                    # Admin dashboard app
│   │   ├── src/
│   │   │   ├── app/              # Next.js App Router
│   │   │   │   ├── api/          # API routes
│   │   │   │   ├── dashboard/    # Dashboard pages
│   │   │   │   ├── layout.tsx    # Root layout
│   │   │   │   └── page.tsx      # Login page
│   │   │   ├── backend/
│   │   │   │   └── services/     # Business logic services
│   │   │   ├── components/       # React components
│   │   │   │   └── admin/        # Admin-specific components
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── lib/              # Utilities and clients
│   │   │   │   └── supabase/     # Supabase clients
│   │   │   └── types/            # TypeScript types
│   │   ├── public/               # Static assets
│   │   ├── package.json
│   │   └── vercel.json           # Cron job configuration
│   │
│   └── leaderboard/              # Public leaderboard app
│       ├── src/
│       │   ├── app/              # Next.js App Router
│       │   │   ├── hall-of-fame/ # Hall of Fame page
│       │   │   ├── house-mvps/   # House MVPs page
│       │   │   ├── globals.css   # Global styles
│       │   │   ├── layout.tsx    # Root layout
│       │   │   └── page.tsx      # Main leaderboard
│       │   ├── components/       # React components
│       │   └── lib/              # Utilities
│       ├── public/               # Static assets (house logos)
│       └── package.json
│
└── supabase/
    └── migrations/               # Database migrations
```

---

## 4. Database Schema

### 4.1 Core Tables

#### `roles`
Defines system roles for RBAC.

```sql
CREATE TABLE roles (
    role_name TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    priority INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default roles
INSERT INTO roles VALUES
    ('super_admin', 'Ultimate system access (Tarbiyah Director)', 1),
    ('admin', 'Full access to all students and analytics', 2),
    ('house_mentor', 'House-scoped access only', 3),
    ('teacher', 'Point awarding and basic view', 4),
    ('support_staff', 'Point awarding and basic view', 5),
    ('parent', 'Parent portal access limited to linked children', 6),
    ('student', 'Student portal access limited to own record', 7);
```

#### `permissions`
Defines granular permissions.

```sql
CREATE TABLE permissions (
    permission_name TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default permissions
INSERT INTO permissions (permission_name, description, category) VALUES
    ('points.award', 'Can award points to students', 'points'),
    ('points.deduct', 'Can deduct points from students', 'points'),
    ('points.view_all', 'Can view all point records', 'points'),
    ('analytics.view_all', 'Can view all analytics', 'analytics'),
    ('analytics.view_house', 'Can view house-specific analytics', 'analytics'),
    ('students.view_all', 'Can view all student records', 'students'),
    ('students.view_house', 'Can view house-specific students', 'students'),
    ('reports.export_all', 'Can export all reports', 'reports'),
    ('reports.export_house', 'Can export house-specific reports', 'reports'),
    ('staff.manage', 'Can manage staff members', 'admin'),
    ('system.configure', 'Can configure system settings', 'admin'),
    ('audit.view', 'Can view audit logs', 'admin');
```

#### `role_permissions`
Junction table mapping roles to permissions.

```sql
CREATE TABLE role_permissions (
    role_name TEXT REFERENCES roles(role_name) ON DELETE CASCADE,
    permission_name TEXT REFERENCES permissions(permission_name) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_name, permission_name)
);
```

#### `profiles`
User profiles extending Supabase auth.

```sql
-- Assuming profiles table exists, add these columns:
ALTER TABLE profiles ADD COLUMN role TEXT REFERENCES roles(role_name);
ALTER TABLE profiles ADD COLUMN assigned_house TEXT;
ALTER TABLE profiles ADD COLUMN linked_student_id UUID;
ALTER TABLE profiles ADD COLUMN linked_staff_id UUID;
ALTER TABLE profiles ADD COLUMN email TEXT;

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_assigned_house ON profiles(assigned_house);
```

#### `students`
Student records.

```sql
CREATE TABLE students (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    grade INTEGER NOT NULL,
    section TEXT,
    house TEXT NOT NULL,
    parent_code TEXT,  -- Hashed code for parent linking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_students_parent_code ON students(parent_code);
CREATE INDEX idx_students_house ON students(house);
CREATE INDEX idx_students_grade ON students(grade);
```

#### `staff`
Staff member records.

```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT,  -- Teacher, Librarian, etc.
    house TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_staff_email ON staff(email);
```

#### `3r_categories`
Merit point categories (Three Rs).

```sql
CREATE TABLE "3r_categories" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    r TEXT NOT NULL,  -- Respect, Responsibility, Righteousness
    subcategory TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    requires_notes BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example categories
INSERT INTO "3r_categories" (r, subcategory, points) VALUES
    ('Respect', 'Respectful Communication', 1),
    ('Respect', 'Active Listening', 1),
    ('Respect', 'Helping Peers', 1),
    ('Respect', 'Following Instructions', 1),
    ('Respect', 'Other', 1),
    ('Responsibility', 'Completing Homework', 1),
    ('Responsibility', 'Being Punctual', 1),
    ('Responsibility', 'Taking Initiative', 1),
    ('Responsibility', 'Owning Mistakes', 1),
    ('Responsibility', 'Other', 1),
    ('Righteousness', 'Honesty', 1),
    ('Righteousness', 'Kindness', 1),
    ('Righteousness', 'Fair Play', 1),
    ('Righteousness', 'Standing Up for Others', 1),
    ('Righteousness', 'Other', 1);
```

#### `merit_log`
Point transaction log.

```sql
CREATE TABLE merit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(student_id),
    student_name TEXT NOT NULL,
    grade INTEGER NOT NULL,
    section TEXT,
    house TEXT NOT NULL,
    r TEXT NOT NULL,  -- Category (Respect/Responsibility/Righteousness)
    subcategory TEXT NOT NULL,
    points INTEGER NOT NULL,
    notes TEXT,
    staff_name TEXT NOT NULL,
    date_of_event DATE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_merit_log_student ON merit_log(student_id);
CREATE INDEX idx_merit_log_house ON merit_log(house);
CREATE INDEX idx_merit_log_date ON merit_log(date_of_event);
CREATE INDEX idx_merit_log_staff ON merit_log(staff_name);
CREATE INDEX idx_merit_log_category ON merit_log(r);
```

#### `merit_log_parent` (View)
Parent-safe view without staff names.

```sql
CREATE VIEW merit_log_parent AS
SELECT
    id, student_id, student_name, grade, section, house,
    r, subcategory, points, notes, date_of_event, timestamp
FROM merit_log;
```

#### `user_settings`
User preferences storage.

```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

#### `parent_students`
Links parents to their children.

```sql
CREATE TABLE parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX idx_parent_students_student_id ON parent_students(student_id);
```

#### `parent_invites`
Email-bound parent invitation codes.

```sql
CREATE TABLE parent_invites (
    invite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_email TEXT NOT NULL,
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    redeemed_by UUID REFERENCES auth.users(id),
    redeemed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_email, student_id)
);

CREATE INDEX idx_parent_invites_email ON parent_invites(LOWER(parent_email));
CREATE INDEX idx_parent_invites_code_hash ON parent_invites(code_hash);
CREATE INDEX idx_parent_invites_active ON parent_invites(active);
```

#### `audit_logs`
System audit trail.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### 4.2 Analytics Tables

#### `analytics_snapshots`
Daily/weekly computed metrics for trend analysis.

```sql
CREATE TABLE analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    snapshot_type TEXT DEFAULT 'daily',  -- 'daily', 'weekly', 'monthly'

    -- Participation metrics
    staff_participation_rate DECIMAL(5,2),
    active_staff_count INTEGER,
    total_staff_count INTEGER,

    -- Point metrics
    points_per_student_avg DECIMAL(8,2),
    points_per_staff_avg DECIMAL(8,2),
    total_points_awarded INTEGER,
    total_transactions INTEGER,

    -- Category distribution
    category_respect_pct DECIMAL(5,2),
    category_responsibility_pct DECIMAL(5,2),
    category_righteousness_pct DECIMAL(5,2),
    category_other_pct DECIMAL(5,2),

    -- House balance
    house_balance_variance DECIMAL(5,2),
    house_points JSONB,

    -- Health scores
    overall_health_score INTEGER CHECK (overall_health_score BETWEEN 0 AND 100),
    status TEXT CHECK (status IN ('GREEN', 'AMBER', 'RED')),
    participation_score INTEGER CHECK (participation_score BETWEEN 0 AND 100),
    category_balance_score INTEGER CHECK (category_balance_score BETWEEN 0 AND 100),
    house_balance_score INTEGER CHECK (house_balance_score BETWEEN 0 AND 100),
    consistency_score INTEGER CHECK (consistency_score BETWEEN 0 AND 100),

    -- Trend data
    participation_change DECIMAL(5,2),
    points_change DECIMAL(5,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(snapshot_date, snapshot_type)
);

CREATE INDEX idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date);
CREATE INDEX idx_analytics_snapshots_type ON analytics_snapshots(snapshot_type);
CREATE INDEX idx_analytics_snapshots_status ON analytics_snapshots(status);
```

#### `staff_analytics`
Individual staff analysis with participation and bias metrics.

```sql
CREATE TABLE staff_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID,
    staff_email TEXT NOT NULL,
    staff_name TEXT,
    analysis_date DATE NOT NULL,
    analysis_period TEXT DEFAULT 'weekly',

    -- Activity metrics
    points_given_period INTEGER DEFAULT 0,
    points_given_total INTEGER DEFAULT 0,
    active_days_period INTEGER DEFAULT 0,
    participation_streak_days INTEGER DEFAULT 0,
    days_since_last_point INTEGER,

    -- Category analysis
    favorite_category TEXT,
    category_distribution JSONB,

    -- Bias detection
    house_bias_coefficient DECIMAL(8,4),
    house_distribution JSONB,
    favored_house TEXT,

    -- Outlier detection
    outlier_flag BOOLEAN DEFAULT FALSE,
    outlier_reason TEXT,
    z_score DECIMAL(8,4),

    -- Comparison metrics
    school_avg_points DECIMAL(8,2),
    department_avg_points DECIMAL(8,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_email, analysis_date, analysis_period)
);

CREATE INDEX idx_staff_analytics_email ON staff_analytics(staff_email);
CREATE INDEX idx_staff_analytics_date ON staff_analytics(analysis_date);
CREATE INDEX idx_staff_analytics_outlier ON staff_analytics(outlier_flag) WHERE outlier_flag = TRUE;
CREATE INDEX idx_staff_analytics_period ON staff_analytics(analysis_period);
```

#### `alert_history`
Track system alerts with severity and resolution.

```sql
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,  -- LOW_PARTICIPATION, CATEGORY_DRIFT, HOUSE_IMBALANCE, OUTLIER_BEHAVIOR, INFLATION, STAFF_INACTIVE
    severity TEXT CHECK (severity IN ('AMBER', 'RED')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    recommended_action TEXT,
    triggered_by_data JSONB,
    related_staff_email TEXT,
    related_metric TEXT,
    metric_value DECIMAL(10,4),
    threshold_value DECIMAL(10,4),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    intervention_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alert_history_status ON alert_history(status);
CREATE INDEX idx_alert_history_type ON alert_history(alert_type);
CREATE INDEX idx_alert_history_severity ON alert_history(severity);
CREATE INDEX idx_alert_history_created ON alert_history(created_at);
CREATE INDEX idx_alert_history_active ON alert_history(status) WHERE status = 'ACTIVE';
```

#### `alert_thresholds`
Configurable thresholds for alert triggering.

```sql
CREATE TABLE alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    amber_threshold DECIMAL(10,4),
    red_threshold DECIMAL(10,4),
    comparison_operator TEXT DEFAULT 'lt' CHECK (comparison_operator IN ('lt', 'lte', 'gt', 'gte', 'eq')),
    is_enabled BOOLEAN DEFAULT TRUE,
    consecutive_periods INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default thresholds
INSERT INTO alert_thresholds (metric_name, display_name, description, amber_threshold, red_threshold, comparison_operator) VALUES
    ('participation_rate', 'Staff Participation Rate', 'Percentage of staff awarding points', 70, 50, 'lt'),
    ('category_imbalance', 'Category Imbalance', 'Dominant category percentage', 50, 60, 'gt'),
    ('house_variance', 'House Variance', 'Point distribution variance between houses', 25, 35, 'gt'),
    ('days_since_point', 'Days Since Last Point', 'Staff inactivity days', 5, 10, 'gt'),
    ('inflation_index', 'Point Inflation Index', 'Ratio vs baseline', 1.5, 2.0, 'gt'),
    ('staff_outlier_zscore', 'Staff Outlier Z-Score', 'Statistical outlier detection', 2.0, 3.0, 'gt'),
    ('weekly_participation_drop', 'Weekly Participation Drop', 'Week-over-week change', 10, 20, 'gt');
```

#### `intervention_logs`
Track playbook-based interventions and outcomes.

```sql
CREATE TABLE intervention_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alert_history(id),
    intervention_type TEXT NOT NULL,
    playbook_used TEXT,
    actions_taken JSONB,
    actions_summary TEXT,
    target_staff_emails TEXT[],
    target_departments TEXT[],
    scheduled_date DATE,
    completed_date DATE,
    outcome_notes TEXT,
    effectiveness_score INTEGER CHECK (effectiveness_score BETWEEN 1 AND 10),
    metrics_before JSONB,
    metrics_after JSONB,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intervention_logs_alert ON intervention_logs(alert_id);
CREATE INDEX idx_intervention_logs_type ON intervention_logs(intervention_type);
CREATE INDEX idx_intervention_logs_status ON intervention_logs(status);
CREATE INDEX idx_intervention_logs_created ON intervention_logs(created_at);
```

#### `intervention_playbooks`
Define intervention templates.

```sql
CREATE TABLE intervention_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_name TEXT NOT NULL UNIQUE,
    description TEXT,
    trigger_alert_types TEXT[],
    trigger_severity TEXT[],
    actions JSONB NOT NULL,
    follow_up_period_days INTEGER DEFAULT 7,
    success_metrics JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default playbooks
INSERT INTO intervention_playbooks (playbook_name, description, trigger_alert_types, trigger_severity, actions) VALUES
    ('Low Participation Response', 'Steps to address low staff participation',
     ARRAY['LOW_PARTICIPATION'], ARRAY['AMBER', 'RED'],
     '[{"step": 1, "action": "Send reminder email to inactive staff"}, {"step": 2, "action": "Schedule 1:1 check-in with department heads"}, {"step": 3, "action": "Review at weekly huddle"}]'::jsonb),
    ('Category Imbalance Correction', 'Address over-reliance on single category',
     ARRAY['CATEGORY_DRIFT'], ARRAY['AMBER', 'RED'],
     '[{"step": 1, "action": "Share category distribution report"}, {"step": 2, "action": "Provide recognition examples for underused categories"}, {"step": 3, "action": "Follow up in 7 days"}]'::jsonb),
    ('House Imbalance Investigation', 'Investigate potential house bias',
     ARRAY['HOUSE_IMBALANCE'], ARRAY['AMBER', 'RED'],
     '[{"step": 1, "action": "Review house distribution by staff"}, {"step": 2, "action": "Check for staff-house assignments"}, {"step": 3, "action": "Discuss at leadership meeting"}]'::jsonb),
    ('Individual Staff Coaching', 'One-on-one coaching for outlier behavior',
     ARRAY['OUTLIER_BEHAVIOR', 'STAFF_INACTIVE'], ARRAY['RED'],
     '[{"step": 1, "action": "Schedule private meeting"}, {"step": 2, "action": "Review individual patterns"}, {"step": 3, "action": "Set improvement goals"}, {"step": 4, "action": "Follow up in 14 days"}]'::jsonb);
```

### 4.3 Reporting Tables

#### `report_templates`
Store customizable report templates.

```sql
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('WEEKLY_DIGEST', 'QUARTERLY_BOARD', 'STAFF_SUMMARY', 'CUSTOM')),
    description TEXT,
    template_config JSONB DEFAULT '{}',
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_cron TEXT,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    recipients JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_report_templates_type ON report_templates(template_type);
CREATE INDEX idx_report_templates_active ON report_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_report_templates_scheduled ON report_templates(is_scheduled) WHERE is_scheduled = TRUE;
```

#### `report_history`
Track generated reports.

```sql
CREATE TABLE report_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES report_templates(id),
    report_type TEXT NOT NULL,
    report_name TEXT NOT NULL,
    period_start DATE,
    period_end DATE,
    report_data JSONB,
    report_url TEXT,
    recipients_sent TEXT[],
    sent_at TIMESTAMP WITH TIME ZONE,
    generated_by UUID REFERENCES auth.users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_report_history_type ON report_history(report_type);
CREATE INDEX idx_report_history_generated ON report_history(generated_at);
CREATE INDEX idx_report_history_template ON report_history(template_id);
```

### 4.4 Email Tables

#### `email_templates`
Store email templates for automated communications.

```sql
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT NOT NULL UNIQUE,
    template_name TEXT NOT NULL,
    description TEXT,
    subject_template TEXT NOT NULL,
    body_html_template TEXT NOT NULL,
    body_text_template TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default templates
INSERT INTO email_templates (template_key, template_name, subject_template, body_html_template) VALUES
    ('weekly_digest', 'Weekly Digest', 'League of Champions Weekly Digest - {{week}}', '<h1>Weekly Summary</h1><p>Health Score: {{healthScore}}</p>'),
    ('alert_notification', 'Alert Notification', '{{severity}} Alert: {{title}}', '<h1>{{title}}</h1><p>{{message}}</p><p>Recommended: {{recommendedAction}}</p>'),
    ('participation_reminder', 'Participation Reminder', 'League of Champions - Activity Reminder', '<p>Dear {{staffName}},</p><p>We noticed you haven''t awarded points recently...</p>'),
    ('category_balance', 'Category Balance', 'Category Distribution Update', '<p>Current 3R distribution needs attention...</p>'),
    ('quarterly_board_report', 'Quarterly Board Report', 'Q{{quarter}} {{year}} League of Champions Report', '<h1>Quarterly Performance Report</h1>');
```

#### `email_queue`
Queue for outgoing emails.

```sql
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT REFERENCES email_templates(template_key),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    template_variables JSONB,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'FAILED')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_for);
```

### 4.5 Database Views

#### `house_standings_view`
Aggregated house standings for leaderboard.

```sql
CREATE VIEW house_standings_view AS
SELECT
    house as house_name,
    SUM(points) as total_points,
    COUNT(DISTINCT student_id) as student_count
FROM merit_log
GROUP BY house
ORDER BY total_points DESC;
```

#### `top_students_per_house`
Top 5 students per house.

```sql
CREATE VIEW top_students_per_house AS
WITH ranked_students AS (
    SELECT
        student_name,
        house,
        SUM(points) as total_points,
        ROW_NUMBER() OVER (PARTITION BY house ORDER BY SUM(points) DESC) as house_rank
    FROM merit_log
    GROUP BY student_name, house
)
SELECT * FROM ranked_students WHERE house_rank <= 5;
```

#### `century_club`
Students with 100+ points.

```sql
CREATE VIEW century_club AS
SELECT
    student_name,
    SUM(points) as total_points
FROM merit_log
GROUP BY student_name
HAVING SUM(points) >= 100
ORDER BY total_points DESC;
```

#### `badr_club`
Students with 300+ points.

```sql
CREATE VIEW badr_club AS
SELECT
    student_name,
    SUM(points) as total_points
FROM merit_log
GROUP BY student_name
HAVING SUM(points) >= 300
ORDER BY total_points DESC;
```

#### `fath_club`
Students with 700+ points.

```sql
CREATE VIEW fath_club AS
SELECT
    student_name,
    SUM(points) as total_points
FROM merit_log
GROUP BY student_name
HAVING SUM(points) >= 700
ORDER BY total_points DESC;
```

### 4.6 Database Functions

#### `has_permission`
Check if user has a specific permission.

```sql
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, perm TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    has_perm BOOLEAN;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = user_id;

    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role_name = user_role AND permission_name = perm
    ) INTO has_perm;

    RETURN has_perm;
END;
$$;
```

#### `redeem_student_invite_code`
Parent redemption of invite codes.

```sql
CREATE OR REPLACE FUNCTION redeem_student_invite_code(code_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_user_role TEXT;
    v_code_hash TEXT;
    v_student_id UUID;
    v_invite_id UUID;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user email from JWT
    v_user_email := auth.jwt() ->> 'email';

    -- Verify user is parent role
    SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;
    IF v_user_role != 'parent' THEN
        RAISE EXCEPTION 'Only parents can redeem invite codes';
    END IF;

    -- Hash the provided code
    v_code_hash := encode(sha256(code_text::bytea), 'hex');

    -- Find matching active invite for this email
    SELECT invite_id, student_id INTO v_invite_id, v_student_id
    FROM parent_invites
    WHERE code_hash = v_code_hash
        AND LOWER(parent_email) = LOWER(v_user_email)
        AND active = TRUE;

    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invite code';
    END IF;

    -- Create parent-student link
    INSERT INTO parent_students (parent_id, student_id)
    VALUES (v_user_id, v_student_id)
    ON CONFLICT DO NOTHING;

    -- Deactivate the invite
    UPDATE parent_invites
    SET active = FALSE, redeemed_by = v_user_id, redeemed_at = NOW()
    WHERE invite_id = v_invite_id;

    RETURN v_student_id;
END;
$$;
```

### 4.7 Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE merit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Students policies
CREATE POLICY "Admins can view all students" ON students
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "House mentors see their house" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'house_mentor'
            AND assigned_house = students.house
        )
    );

CREATE POLICY "Parents can view linked students" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parent_students
            WHERE parent_id = auth.uid()
            AND student_id = students.student_id
        )
    );

CREATE POLICY "Students can view own record" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND linked_student_id = students.student_id
        )
    );

-- Merit log policies
CREATE POLICY "Admins can view all merit logs" ON merit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Staff can view all merit logs" ON merit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'support_staff', 'house_mentor'))
    );

CREATE POLICY "Staff can insert merit logs" ON merit_log
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'teacher', 'support_staff', 'house_mentor'))
    );

-- User settings policies
CREATE POLICY "Users can manage own settings" ON user_settings
    FOR ALL USING (user_id = auth.uid());

-- Parent students policies
CREATE POLICY "Parents can view own links" ON parent_students
    FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage parent links" ON parent_students
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Audit logs policies
CREATE POLICY "Audit viewers can read" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN role_permissions rp ON p.role = rp.role_name
            WHERE p.id = auth.uid() AND rp.permission_name = 'audit.view'
        )
    );
```

---

## 5. Portal App - Complete Specification

### 5.1 Package Dependencies

```json
{
  "name": "league-of-stars-web",
  "version": "0.1.0",
  "dependencies": {
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.89.0",
    "@tailwindcss/postcss": "^4.1.18",
    "next": "^16.1.0",
    "pdf-parse": "^1.1.1",
    "postcss": "^8.5.6",
    "react": "19.2.1",
    "react-dom": "19.2.1",
    "recharts": "^3.6.0",
    "tailwindcss": "^4.1.18"
  },
  "devDependencies": {
    "@types/node": "25.0.3",
    "@types/react": "19.2.7",
    "@types/react-dom": "^19",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@playwright/test": "^1.55.0",
    "jsdom": "^26.1.0",
    "typescript": "5.9.3",
    "vitest": "^3.2.4"
  }
}
```

### 5.2 Pages & Routes

#### Login Page (`/`)
- Email/password authentication via Supabase
- Redirect to dashboard on success
- Role-based dashboard routing

#### Dashboard Layout (`/dashboard`)
- **Sidebar Navigation**: Role-based menu items
- **Mobile Navigation**: Hamburger menu with slide-out drawer
- **Header**: User info, date, logout button
- **Permission Gates**: Access control wrappers

#### Dashboard Home (`/dashboard`)
- 4 house cards with total points, rankings
- Top performers per house
- Real-time updates via Supabase subscriptions
- Pagination for large datasets

#### Add Points (`/dashboard/add-points`)
**Features:**
- Multi-student selection with search
- Bulk filtering by grade/section/house
- 3R category selection with subcategories
- Event date picker
- Optional notes field
- Draft persistence (sessionStorage)
- Success/error toast notifications

**UI Components:**
- Student search input
- Filter dropdowns (grade, section, house)
- Student selection chips
- Category tabs (Respect, Responsibility, Righteousness)
- Subcategory grid buttons
- Date picker
- Notes textarea
- Submit button with loading state

#### Students (`/dashboard/students`)
**Features:**
- Search by student name
- Filter by grade, section, house
- Grouped by class (grade + section)
- Detail panel with:
  - Total points
  - Category breakdown pie chart
  - Recent activity list (10 entries)
- Different views for parent vs staff roles
- Persistent filters via sessionStorage

#### Analytics (`/dashboard/analytics`)
**Features:**
- Multi-level filters: house, grade, section, staff, category, subcategory, date range
- Real-time Supabase subscriptions
- Export: CSV and PDF
- Recharts visualizations:
  - Points by House (Bar chart)
  - Points by Category (Pie chart)
- 6 metric cards:
  - Total Points
  - Total Records
  - Unique Students
  - Active Staff
  - Avg Points/Student
  - Avg Points/Award
- Pagination (1000 records/page)

#### Tier 2 Analytics (`/dashboard/tier2-analytics`)
**Features:**
- Overall health score (0-100) with circular gauge
- 4 component scores:
  - Participation Score
  - Category Balance Score
  - House Balance Score
  - Consistency Score
- Key metrics display
- Active alerts panel (RED/AMBER severity)
- Category distribution chart
- House distribution chart with variance
- Inactive staff list
- Date range presets (7/14/30 days)
- Manual date range selection
- Alert acknowledgment functionality

#### Staff Engagement (`/dashboard/staff`)
**Features:**
- Date range filters with presets
- House & grade filters
- Staff tier distribution pie chart:
  - High (>80%)
  - Medium (30-80%)
  - Low (<30%)
- Consistency leaderboard (top 10)
- Monthly staff rewards:
  - House Spirit Award
  - 3R All-Star
  - Steady Hand Award
  - Diamond Finder Award
  - House Champions
- Detailed staff table with columns:
  - Staff Name
  - Active Days
  - Consistency %
  - Entries Count
  - Notes Compliance %
  - Missing Notes
  - Category Diversity
  - Roster Flags
  - Last Active Date
- Modals for roster issues and missing notes
- CSV export (roster + notes)
- Sortable columns
- Real-time subscriptions

#### Behaviour Analytics (`/dashboard/behaviour`)
**Features:**
- File upload (CSV/PDF, max 10MB)
- Source system dropdown
- Recent uploads history
- Latest analysis display
- Admin-only access

#### Reports (`/dashboard/reports`)
**Features:**
- 8 report templates:
  1. All-Time Summary
  2. House Snapshot
  3. Grade Leaderboard
  4. Category Report
  5. Monthly Merit
  6. Monthly Highlights
  7. Leadership Summary
  8. Staff Recognition
- Custom report generation
- Date range filtering
- CSV & PDF export
- Custom SVG charts in PDFs
- School crest in PDF headers

#### Rewards (`/dashboard/rewards`)
**Features:**
- Hall of Fame tabs:
  - Century Club (100+ points)
  - Badr Club (300+ points)
  - Fath Club (700+ points)
- Quarterly Badges:
  - Honour Guard
  - Keeper
  - Light Bearer
  - Gender-split winners
- Monthly Rewards:
  - Consistency Crown
  - Rising Star
  - House MVPs
  - Grade Champions
- Approaching milestones list

#### Settings (`/dashboard/settings`)
**Features:**
- Role-specific toggle sections
- Account info display (email, role)
- Parent: Link student via invite code
- Password reset functionality
- Persists to user_settings table

#### Profile (`/dashboard/profile`)
**Features:**
- Student view:
  - Total points with house color
  - 3R category breakdown
  - Recent activity list (10 entries)

#### House (`/dashboard/house`)
**Features:**
- House name, logo, rank
- Total points, percentage share
- Comparison with all house standings
- Gradient background by house config

### 5.3 Components

#### Root Components

**CrestLoader.tsx**
```tsx
interface CrestLoaderProps {
  label?: string;  // Loading message
}
// Displays school crest with pulsing animation
// Shows system name and school values
```

**DashboardHeader.tsx**
```tsx
interface DashboardHeaderProps {
  userName: string;
  role: 'student' | 'parent' | 'staff';
  onMenuClick: () => void;
  showMenuButton: boolean;
}
// Top navigation bar with date, user badge, logout
```

**Sidebar.tsx**
```tsx
interface SidebarProps {
  role: 'student' | 'parent' | 'staff';
  portalLabel: string;
  showAdmin?: boolean;
}
// Desktop fixed sidebar with role-based navigation
// Student: Leaderboard, My Points, My House, Settings
// Parent: Leaderboard, My Children, Settings
// Staff: Leaderboard, Students, Add Points, Settings
```

**MobileNav.tsx**
```tsx
interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  role: 'student' | 'parent' | 'staff';
  portalLabel: string;
  showAdmin: boolean;
}
// Slide-out mobile navigation drawer
```

**PermissionGate.tsx**
```tsx
// Access control components:
export function RequirePermission({ permission, children, fallback })
export function RequireRole({ roles, children, fallback })
export function RequireStaff({ children, fallback })
export function PermissionGate({ permission, role, children, fallback })
export function AccessDenied()
```

#### Admin Components

**AddPointsClient.tsx**
- Complete point awarding interface
- Student search with bulk filtering
- 3 merit categories with subcategories
- Draft persistence
- Real-time Supabase updates

**Sidebar.tsx (Admin)**
- Drag-and-drop reordering
- Hide/show menu items
- Favorites/pinning
- Compact mode toggle
- 12 navigation items
- Saves preferences to database

### 5.4 Custom Hooks

**usePermissions.ts**
```tsx
// Check single permission
export function usePermission(permission: Permission): {
  hasPermission: boolean;
  loading: boolean;
}

// Check multiple permissions
export function usePermissions(permissions: Permission[]): {
  permissions: Record<Permission, boolean>;
  loading: boolean;
}

// Get user role
export function useUserRole(): {
  role: Role | null;
  loading: boolean;
}

// Get user's assigned house
export function useUserHouse(): {
  house: string | null;
  loading: boolean;
}

// Get all user permissions
export function useAllPermissions(): {
  permissions: { permission_name: string; description: string; category: string }[];
  loading: boolean;
}

// Get full user profile
export function useUserProfile(): {
  profile: UserProfile | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

// Combined auth hook
export function useAuth(): {
  role: Role | null;
  profile: UserProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isParent: boolean;
  isStudent: boolean;
  assignedHouse: string | null;
}
```

**useSessionStorageState.ts**
```tsx
export function useSessionStorageState<T>(key: string, defaultValue: T): [T, (value: T) => void]
// Persists state to sessionStorage
// Handles SSR (returns default on server)
// Handles storage errors gracefully
```

### 5.5 Utility Libraries

#### `lib/supabase/admin.ts`
```typescript
export function getSupabaseAdmin(): SupabaseClient
// Creates admin client with service role key
// Full database access, bypasses RLS
```

#### `lib/supabase/server.ts`
```typescript
export async function createSupabaseServerClient(): Promise<SupabaseClient>
// Server-side client with cookie-based auth
// For API routes and server components
```

#### `lib/supabaseClient.ts`
```typescript
export function getSupabase(): SupabaseClient
export const supabase: SupabaseClient  // Proxy for lazy init
// Browser-side singleton client
```

#### `lib/apiAuth.ts`
```typescript
export async function requireAuthenticatedUser(): Promise<{
  error?: Response;
  supabase?: SupabaseClient;
  user?: User;
}>

export async function requireRole(roles: string[]): Promise<{
  error?: Response;
  supabase?: SupabaseClient;
  user?: User;
  role?: string;
}>
```

#### `lib/permissions.ts`
```typescript
// Permission constants
export const PERMISSIONS = {
  'points.award', 'points.deduct', 'points.view_all',
  'analytics.view_all', 'analytics.view_house',
  'students.view_all', 'students.view_house',
  'reports.export_all', 'reports.export_house',
  'staff.manage', 'system.configure', 'audit.view'
}

// Role enum
export type Role = 'admin' | 'staff' | 'parent' | 'student'

// Permission checking functions
export async function hasPermission(supabase, permission): Promise<boolean>
export async function getUserRole(supabase): Promise<Role | null>
export async function getUserHouse(supabase): Promise<string | null>
export async function getUserPermissions(supabase): Promise<Permission[]>
export async function getUserProfile(supabase): Promise<UserProfile | null>
export function isElevatedRole(role): boolean
export function isSuperAdmin(role): boolean
export function canViewAllData(role): boolean
export function isHouseRestricted(role): boolean
```

#### `lib/schoolDays.ts`
```typescript
interface SchoolDaysOptions {
  excludeWeekends?: boolean;
  calendarDates?: string[];
}

export function getSchoolDays(
  startDate: string,
  endDate: string,
  options?: SchoolDaysOptions
): string[]
// Returns array of school day dates (YYYY-MM-DD)
```

---

## 6. Leaderboard App - Complete Specification

### 6.1 Package Dependencies

```json
{
  "name": "los_temp",
  "version": "0.1.0",
  "dependencies": {
    "@supabase/supabase-js": "^2.89.0",
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### 6.2 Pages

#### Main Leaderboard (`/`)
**Features:**
- School crest logo (centered)
- Title: "League of Champions Leaderboard"
- Tagline: "Where Stars Are Made"
- Navigation buttons: House MVPs, Hall of Fame
- 4 house cards ranked by total points
- Animated starfield background
- Real-time updates (30s polling + Supabase subscriptions)

**Data Source:** `house_standings_view`

#### Hall of Fame (`/hall-of-fame`)
**Features:**
- Three achievement tiers:
  - **Century Club** (100+ points): Gold/bronze accent
  - **Badr Club** (300+ points): Green accent, moon icon
  - **Fath Club** (700+ points): Blue-gray accent, trophy icon
- 3-column responsive grid
- Student count per tier
- Scrollable student lists

**Data Sources:** `century_club`, `badr_club`, `fath_club` views

#### House MVPs (`/house-mvps`)
**Features:**
- Top 5 students per house
- House-colored cards with logos
- 2-column responsive grid
- Ranked student lists

**Data Source:** `top_students_per_house` view

### 6.3 Components

#### HouseCard.tsx
```tsx
interface HouseCardProps {
  rank: number;
  houseName: string;
  points: number;
  houseConfig: HouseConfig;
}

// Displays:
// - Rank badge (gold gradient circle)
// - House name (colored)
// - House virtue (italicized)
// - Description
// - Total points (large)
// - House logo
// - House-colored left border
// - Light pastel background
// - Float animation on hover
```

#### AutoRotate.tsx
```tsx
// Client-side auto-rotation between pages
// Routes: /, /house-mvps, /hall-of-fame
// Interval: 15 seconds
// Uses Next.js router for navigation
```

### 6.4 Styling

#### Global CSS (`globals.css`)
```css
:root {
  --primary: #2f0a61;      /* Royal Purple */
  --accent: #c9a227;       /* Gold */
  --accent-light: #e8d48b;
  --accent-dark: #9a7b1a;
  --bg-dark: #1a1a2e;      /* Charcoal */
  --cream: #faf9f7;
  --ivory: #f5f3ef;
}

/* Animations */
.starry-bg {
  /* Animated twinkling starfield with radial gradients */
  /* Two layers with 8s and 12s animation cycles */
}

.float-card {
  /* Subtle floating animation */
  /* 5.5-6.5s duration, -8px vertical movement */
  /* Staggered delays create wave effect */
}

.gold-underline {
  /* Gold gradient line beneath titles */
  /* 100px wide, 3px height */
}

.badge-gold {
  /* Rank badge with gold gradient */
}

.regal-card {
  /* White to cream gradient cards */
  /* Gold border, shadow effects */
  /* Hover lift animation */
}
```

#### Typography
- **Display Font:** Playfair Display (italic for main titles)
- **Body Font:** Cinzel (elegant serif)
- Google Fonts loaded in layout.tsx

### 6.5 Real-time Features

```typescript
// Supabase channel subscription
const channel = supabase
  .channel('leaderboard-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'merit_log' }, refresh)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, refresh)
  .subscribe()

// Polling interval
setInterval(fetchData, 30000)

// Visibility change detection
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') fetchData()
})
```

---

## 7. API Routes Reference

### 7.1 Alerts

#### `GET /api/alerts`
**Auth:** Admin required

**Query Parameters:**
- `detail`: `'summary'` | `'history'` | `'active'`
- `status`: `'ACTIVE'` | `'ACKNOWLEDGED'` | `'RESOLVED'` | `'DISMISSED'`
- `type`: Alert type filter
- `severity`: `'AMBER'` | `'RED'`
- `limit`: Number (default: 50)
- `offset`: Number (default: 0)

**Response:**
```json
{
  "alerts": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### `POST /api/alerts`
**Auth:** Admin required

**Body:**
```json
{
  "action": "check",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

#### `GET /api/alerts/[id]`
Returns single alert by ID.

#### `PATCH /api/alerts/[id]`
**Body:**
```json
{
  "action": "acknowledge" | "resolve" | "dismiss",
  "resolutionNotes": "string"
}
```

### 7.2 Points

#### `POST /api/points/award`
**Auth:** Authenticated staff

**Body:**
```json
{
  "mode": "students" | "house_competition",
  "categoryId": "uuid",
  "students": [
    {
      "name": "Student Name",
      "grade": 5,
      "section": "A",
      "house": "House Name"
    }
  ],
  "notes": "Optional notes",
  "eventDate": "YYYY-MM-DD"
}
```

**Response:**
```json
{
  "inserted": 5
}
```

### 7.3 Staff Engagement

#### `GET /api/staff/engagement`
**Auth:** Admin required

**Query Parameters:**
- `startDate`: Required (YYYY-MM-DD)
- `endDate`: Required (YYYY-MM-DD)
- `detail`: `'months'` | `'calendar-range'` | `'missing-notes'` | `'roster'`
- `staffName`: Filter by staff
- `house`: Filter by house
- `grade`: Filter by grade

**Response:**
```json
{
  "staff": [
    {
      "staff_name": "...",
      "email": "...",
      "active_days": 15,
      "consistency_pct": 75.5,
      "entries_count": 45,
      "notes_compliance_pct": 92.3,
      "roster_flags": {
        "missing_house": false,
        "missing_grade": false,
        "inactive": false
      }
    }
  ],
  "global": {
    "inflation_index": 1.2,
    "possible_school_days": 20,
    "available_grades": [1, 2, 3, 4, 5],
    "available_houses": ["House A", "House B"]
  }
}
```

### 7.4 Behaviour

#### `POST /api/behaviour/upload`
**Auth:** Super Admin required
**Content-Type:** multipart/form-data

**Form Data:**
- `file`: CSV or PDF file (max 10MB)
- `source_system`: Optional string

#### `POST /api/behaviour/reprocess`
**Auth:** Super Admin required

**Body:**
```json
{
  "student_ids": ["uuid1", "uuid2"]  // Optional
}
```

### 7.5 Interventions

#### `GET /api/interventions`
**Query Parameters:**
- `detail`: `'playbooks'` | `'history'`
- `alert_id`: Filter by alert
- `status`: Filter by status
- `limit`: Number (default: 20)

#### `POST /api/interventions`
**Body:**
```json
{
  "playbook_id": "uuid",
  "alert_id": "uuid",
  "target_staff_emails": ["email@example.com"],
  "actions_override": ["Custom action"],
  "scheduled_date": "YYYY-MM-DD",
  "notes": "Optional notes"
}
```

#### `PATCH /api/interventions/[id]`
**Body:**
```json
{
  "status": "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  "actions_taken": [...],
  "outcome_notes": "...",
  "effectiveness_score": 8
}
```

### 7.6 Analytics

#### `GET /api/analytics/point-economy`
**Query:** `startDate`, `endDate`

**Response:**
```json
{
  "summary": {
    "totalPoints": 5000,
    "totalTransactions": 500,
    "pointsPerStudent": 25.5,
    "pointsPerStaff": 125.0,
    "avgPerTransaction": 10.0,
    "dailyAverage": 166.7,
    "weekOverWeekChange": 5.2
  },
  "trends": {
    "weekly": [...]
  }
}
```

#### `GET /api/analytics/house-distribution`
**Response:**
```json
{
  "points": { "House A": 1200, "House B": 1100 },
  "percentages": { "House A": 52.2, "House B": 47.8 },
  "ranking": [...],
  "variance": 4.4,
  "isBalanced": true,
  "balanceScore": 91,
  "status": "GREEN"
}
```

#### `GET /api/analytics/category-balance`
**Response:**
```json
{
  "distribution": {
    "Respect": 450,
    "Responsibility": 380,
    "Righteousness": 420
  },
  "percentages": { ... },
  "dominantCategory": "Respect",
  "isBalanced": true,
  "balanceScore": 85,
  "status": "GREEN"
}
```

#### `GET /api/analytics/staff-participation`
**Query Parameters:**
- `startDate`, `endDate`
- `detail`: `'bias'` | `'outliers'` | `'analytics'`
- `threshold`: Bias threshold (default: 4.0)
- `period`: `'daily'` | `'weekly'` | `'monthly'`

#### `GET /api/analytics/health-overview`
**Query Parameters:**
- `startDate`, `endDate`
- `detail`: `'history'` | `'latest'`
- `limit`: For history
- `type`: Snapshot type

**Response:**
```json
{
  "health": {
    "score": 82,
    "status": "GREEN",
    "participationScore": 85,
    "categoryBalanceScore": 80,
    "houseBalanceScore": 78,
    "consistencyScore": 90
  },
  "metrics": { ... },
  "alerts": {
    "activeCount": 2,
    "redCount": 0,
    "amberCount": 2
  }
}
```

#### `POST /api/analytics/health-overview`
Generate and store new snapshot.

**Body:**
```json
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "snapshotType": "daily" | "weekly" | "monthly"
}
```

### 7.7 Reports

#### `POST /api/reports/generate`
**Body:**
```json
{
  "reportType": "weekly_digest" | "quarterly_board" | "staff_summary" | "custom",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "quarter": "Q1",  // For quarterly
  "year": 2024,
  "save": true
}
```

#### `GET /api/reports/generate`
Get historical reports.

**Query:** `type`, `limit`

### 7.8 Cron Jobs

#### `GET /api/cron/daily-analytics`
**Schedule:** Daily at 2 AM

**Actions:**
1. Generate daily/weekly/monthly snapshots
2. Calculate staff analytics
3. Check alert thresholds
4. Auto-resolve stale alerts (>30 days)

#### `GET /api/cron/weekly-digest`
**Schedule:** Friday at 4 PM

**Actions:**
1. Generate weekly digest
2. Send emails to recipients
3. Archive to report history

#### `GET /api/cron/alert-monitor`
**Schedule:** Hourly during school hours (8 AM - 4 PM, Mon-Fri)

**Actions:**
1. Check all thresholds
2. Detect critical RED alerts
3. Get alert summary

---

## 8. Backend Services

### 8.1 Analytics Calculator (`analyticsCalculator.ts`)

```typescript
// Staff participation metrics
export async function calculateStaffParticipation(startDate: string, endDate: string): Promise<{
  participationRate: number;
  activeStaffCount: number;
  totalStaffCount: number;
  avgPointsPerStaff: number;
  staffMetrics: Map<string, StaffMetric>;
}>

// Point economy metrics
export async function calculatePointEconomy(startDate: string, endDate: string): Promise<{
  totalPoints: number;
  totalTransactions: number;
  pointsPerStudent: number;
  pointsPerStaff: number;
  avgPointsPerTransaction: number;
  weeklyTrend: WeeklyData[];
}>

// Category balance
export async function calculateCategoryBalance(startDate: string, endDate: string): Promise<{
  distribution: Record<string, number>;
  percentages: Record<string, number>;
  dominantCategory: string;
  isBalanced: boolean;
  balanceScore: number;
}>

// House distribution
export async function calculateHouseDistribution(startDate: string, endDate: string): Promise<{
  housePoints: Record<string, number>;
  percentages: Record<string, number>;
  variance: number;
  isBalanced: boolean;
  balanceScore: number;
}>

// Composite health score
export function calculateCompositeHealthScore(
  participationScore: number,
  categoryBalanceScore: number,
  houseBalanceScore: number,
  consistencyScore: number
): { score: number; status: 'GREEN' | 'AMBER' | 'RED' }

// Generate and save snapshots
export async function generateAnalyticsSnapshot(
  startDate: string,
  endDate: string,
  snapshotType: 'daily' | 'weekly' | 'monthly'
): Promise<AnalyticsSnapshot>
```

### 8.2 Alert Engine (`alertEngine.ts`)

```typescript
// Get configurable thresholds
export async function getAlertThresholds(): Promise<Map<string, AlertThreshold>>

// Create alert
export async function createAlert(alert: NewAlert): Promise<string | null>

// Get active alerts
export async function getActiveAlerts(): Promise<Alert[]>

// Update alert status
export async function acknowledgeAlert(alertId: string, userId: string): Promise<boolean>
export async function resolveAlert(alertId: string, userId: string, notes?: string): Promise<boolean>
export async function dismissAlert(alertId: string): Promise<boolean>

// Check all thresholds and create alerts
export async function checkAllThresholds(startDate: string, endDate: string): Promise<Alert[]>

// Get alert history with filters
export async function getAlertHistory(options: AlertHistoryOptions): Promise<{
  alerts: Alert[];
  total: number;
}>

// Get summary for dashboard
export async function getAlertSummary(): Promise<{
  activeCount: number;
  redCount: number;
  amberCount: number;
  recentAlerts: Alert[];
}>

// Auto-resolve old alerts
export async function autoResolveStaleAlerts(daysOld: number): Promise<number>
```

**Alert Types:**
- `LOW_PARTICIPATION`: Staff participation below threshold
- `CATEGORY_DRIFT`: Dominant category exceeds threshold
- `HOUSE_IMBALANCE`: House variance exceeds threshold
- `OUTLIER_BEHAVIOR`: Staff Z-score exceeds threshold
- `INFLATION`: Point inflation detected
- `STAFF_INACTIVE`: Days since last point exceeds threshold

### 8.3 Bias Detector (`biasDetector.ts`)

```typescript
// Chi-square analysis for house bias
export function analyzeStaffHouseBias(
  staffEntries: MeritEntry[],
  schoolHouseDistribution: Record<string, number>
): BiasAnalysis

// Z-score outlier detection
export function detectOutlierStaff(
  staffPointsMap: Map<string, number>,
  threshold: number
): OutlierAnalysis[]

// Generate and save staff analytics
export async function generateStaffAnalytics(
  startDate: string,
  endDate: string,
  analysisPeriod: string
): Promise<StaffAnalyticsRecord[]>

// Get staff with significant bias
export async function getStaffWithBias(biasThreshold: number): Promise<StaffAnalyticsRecord[]>

// Get statistical outliers
export async function getStaffOutliers(): Promise<StaffAnalyticsRecord[]>
```

**Bias Coefficient Scale:**
- 0-2: No significant bias
- 2-4: Mild bias
- 4-6: Moderate bias
- 6-8: Strong bias
- 8-10: Extreme bias

### 8.4 Digest Generator (`digestGenerator.ts`)

```typescript
// Weekly digest
export async function generateWeeklyDigest(
  startDate: string,
  endDate: string
): Promise<WeeklyDigestData>

// Send digest emails
export async function sendWeeklyDigestEmails(
  digestData: WeeklyDigestData,
  recipients: string[]
): Promise<number>

// Quarterly report
export async function generateQuarterlyReport(
  quarter: string,
  year: number,
  startDate: string,
  endDate: string
): Promise<QuarterlyReportData>

// Save to history
export async function saveReportToHistory(
  reportType: string,
  reportName: string,
  periodStart: string,
  periodEnd: string,
  reportData: object,
  generatedBy?: string
): Promise<string | null>
```

### 8.5 Email Service (`emailService.ts`)

```typescript
// Get template by key
export async function getEmailTemplate(templateKey: string): Promise<EmailTemplate | null>

// Queue email for sending
export async function queueEmail(email: QueuedEmail): Promise<string | null>

// Send templated email
export async function sendTemplatedEmail(
  templateKey: string,
  recipientEmail: string,
  recipientName: string,
  variables: Record<string, any>,
  scheduledFor?: Date
): Promise<string | null>

// Process email queue
export async function processEmailQueue(batchSize?: number): Promise<{
  processed: number;
  sent: number;
  failed: number;
}>

// Queue alert notifications
export async function queueAlertNotifications(
  alerts: Alert[],
  recipients: string[]
): Promise<number>

// Queue participation reminders
export async function queueParticipationReminders(
  inactiveStaff: StaffRecord[]
): Promise<number>
```

### 8.6 Behaviour Analyzer (`behaviourAnalyzer.ts`)

```typescript
// Reprocess insights for students
export async function reprocessBehaviourInsights(
  studentIds?: string[]
): Promise<{
  processed: number;
  students: StudentInsight[];
}>
```

**Pattern Detection:**
- `early_concern`: 3+ demerits in 7 days
- `escalation`: Week-over-week increase
- `context_isolation`: 60%+ demerits from same source
- `strength_struggle_mismatch`: Leadership + disruption combination

---

## 9. Authentication & Authorization

### 9.1 Supabase Auth Setup

```typescript
// Browser client (anonymous key)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server client with cookies (user context)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => cookies.forEach(c => cookieStore.set(c.name, c.value, c.options))
      }
    }
  )
}

// Admin client (service role - full access)
import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
```

### 9.2 Role-Based Access Control

**Role Hierarchy:**
1. `super_admin` - Full system access
2. `admin` - Full access to all data
3. `house_mentor` - House-scoped access
4. `teacher` - Point awarding, basic view
5. `support_staff` - Point awarding, basic view
6. `parent` - View linked children only
7. `student` - View own record only

**Permission Categories:**
- `points.*` - Point management
- `analytics.*` - Analytics access
- `students.*` - Student data access
- `reports.*` - Report generation
- `staff.*` - Staff management
- `system.*` - System configuration
- `audit.*` - Audit log access

### 9.3 API Route Protection

```typescript
// Require authenticated user
export async function GET(request: Request) {
  const { error, user } = await requireAuthenticatedUser()
  if (error) return error

  // Proceed with user context
}

// Require specific role
export async function GET(request: Request) {
  const { error, user, role } = await requireRole(['admin', 'super_admin'])
  if (error) return error

  // Proceed with admin access
}
```

---

## 10. School Configuration

### 10.1 Configuration Structure

```typescript
interface SchoolConfig {
  schoolName: string;
  systemName: string;
  tagline: string;
  crestLogo: string;
  favicon: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  houses: HouseConfig[];
  meritCategories: {
    name: string;
    subcategories: string[];
  }[];
  clubTiers: {
    name: string;
    threshold: number;
    icon: string;
    color: string;
  }[];
  academicYear: {
    startMonth: number;
    quarters: string[];
  };
}

interface HouseConfig {
  name: string;
  color: string;
  gradient: string;
  accentGradient: string;
  logo: string;
  virtue: string;
  description: string;
  backgroundColor: string;
  aliases: string[];
}
```

### 10.2 Demo Configuration

```typescript
const demoConfig: SchoolConfig = {
  schoolName: "Dār al-Arqam Islamic School",
  systemName: "League of Champions",
  tagline: "Where Stars Are Made",
  crestLogo: "/school_crest.png",
  favicon: "/favicon.ico",
  colors: {
    primary: "#2f0a61",    // Royal Purple
    accent: "#c9a227",     // Gold
    background: "#1a1a2e", // Dark Charcoal
    text: "#1a1a2e"
  },
  houses: [
    {
      name: "House of Abū Bakr",
      color: "#2f0a61",
      virtue: "Loyalty",
      description: "Rooted in honesty, unwavering in loyalty to faith and community.",
      logo: "/house_of_abubakr.png",
      backgroundColor: "#f6f1fb",
      aliases: ["abu bakr", "abubakr", "abu-bakr", "bakr"]
    },
    {
      name: "House of Khadījah",
      color: "#055437",
      virtue: "Wisdom",
      description: "Guided by wisdom, leading with grace and strength.",
      logo: "/house_of_khadijah.png",
      backgroundColor: "#f1fbf6",
      aliases: ["khadijah", "khadija", "khad"]
    },
    {
      name: "House of ʿUmar",
      color: "#000068",
      virtue: "Moral Courage",
      description: "Living with fairness, speaking truth, and acting with courage.",
      logo: "/house_of_umar.png",
      backgroundColor: "#f2f3fb",
      aliases: ["umar", "omar"]
    },
    {
      name: "House of ʿĀʾishah",
      color: "#910000",
      virtue: "Creativity",
      description: "Igniting creativity that inspires hearts and serves Allah.",
      logo: "/house_of_aishah.png",
      backgroundColor: "#fdf1f1",
      aliases: ["aishah", "aisha", "ayesha"]
    }
  ],
  meritCategories: [
    {
      name: "Respect",
      subcategories: ["Respectful Communication", "Active Listening", "Helping Peers", "Following Instructions", "Other"]
    },
    {
      name: "Responsibility",
      subcategories: ["Completing Homework", "Being Punctual", "Taking Initiative", "Owning Mistakes", "Other"]
    },
    {
      name: "Righteousness",
      subcategories: ["Honesty", "Kindness", "Fair Play", "Standing Up for Others", "Other"]
    }
  ],
  clubTiers: [
    { name: "Century Club", threshold: 100, icon: "100", color: "#9a7b1a" },
    { name: "Badr Club", threshold: 300, icon: "🌙", color: "#23523b" },
    { name: "Fath Club", threshold: 700, icon: "🏆", color: "#3b4a6b" }
  ],
  academicYear: {
    startMonth: 8,  // August
    quarters: ["Q1", "Q2", "Q3", "Q4"]
  }
}
```

### 10.3 Utility Functions

```typescript
// Get house config by name (handles aliases and unicode)
export function getHouseConfig(houseName: string): HouseConfig | undefined

// Normalize house name to canonical form
export function canonicalHouseName(houseName: string): string

// Get house config as lookup object
export function getHouseConfigRecord(): Record<string, HouseConfig>

// Get house colors mapping
export function getHouseColors(): Record<string, string>

// Get array of house names
export function getHouseNames(): string[]
```

---

## 11. Environment Variables

### 11.1 Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Portal only - Server-side
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# School configuration
NEXT_PUBLIC_SCHOOL_CONFIG=demo  # or 'bha' for production

# Cron authentication
CRON_SECRET=your-cron-secret

# Email recipients (optional, falls back to admin list)
DIGEST_RECIPIENTS=admin1@school.edu,admin2@school.edu
```

### 11.2 Optional Variables

```env
# Email service (future integration)
RESEND_API_KEY=your-resend-key
SENDGRID_API_KEY=your-sendgrid-key

# Analytics
VERCEL_ANALYTICS_ID=your-analytics-id
```

---

## 12. Deployment Configuration

### 12.1 Vercel Configuration

**vercel.json (Portal)**
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-analytics",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 16 * * 5"
    },
    {
      "path": "/api/cron/alert-monitor",
      "schedule": "0 8-16 * * 1-5"
    }
  ]
}
```

### 12.2 Build Commands

**Portal**
```bash
npm run build    # next build
npm run start    # next start
npm run dev      # next dev
npm run lint     # next lint
npm run test:unit    # vitest
npm run test:e2e     # playwright
```

**Leaderboard**
```bash
npm run build    # next build
npm run start    # next start
npm run dev      # next dev
npm run lint     # eslint
```

### 12.3 Asset Requirements

**Portal Public Assets:**
- `/school_crest.png` - School crest logo
- `/favicon.ico` - Favicon

**Leaderboard Public Assets:**
- `/school_crest.png` - School crest logo
- `/house_of_abubakr.png` - House logo
- `/house_of_khadijah.png` - House logo
- `/house_of_umar.png` - House logo
- `/house_of_aishah.png` - House logo

---

## Appendix A: Type Definitions

```typescript
// Roles
type Role = 'admin' | 'staff' | 'parent' | 'student'

// Permissions
type Permission =
  | 'points.award' | 'points.deduct' | 'points.view_all'
  | 'analytics.view_all' | 'analytics.view_house'
  | 'students.view_all' | 'students.view_house'
  | 'reports.export_all' | 'reports.export_house'
  | 'staff.manage' | 'system.configure' | 'audit.view'

// Alert types
type AlertType =
  | 'LOW_PARTICIPATION'
  | 'CATEGORY_DRIFT'
  | 'HOUSE_IMBALANCE'
  | 'OUTLIER_BEHAVIOR'
  | 'INFLATION'
  | 'STAFF_INACTIVE'

// Alert severity
type AlertSeverity = 'AMBER' | 'RED'

// Alert status
type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'

// Health status
type HealthStatus = 'GREEN' | 'AMBER' | 'RED'

// Intervention status
type InterventionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

// Report types
type ReportType = 'WEEKLY_DIGEST' | 'QUARTERLY_BOARD' | 'STAFF_SUMMARY' | 'CUSTOM'

// Email status
type EmailStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED'

// Snapshot types
type SnapshotType = 'daily' | 'weekly' | 'monthly'

// 3R Categories
type Category = 'Respect' | 'Responsibility' | 'Righteousness'
```

---

## Appendix B: API Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (missing/invalid auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 500 | Server error |

---

## Appendix C: Database Indexes Summary

```sql
-- Performance-critical indexes
CREATE INDEX idx_merit_log_date ON merit_log(date_of_event);
CREATE INDEX idx_merit_log_student ON merit_log(student_id);
CREATE INDEX idx_merit_log_house ON merit_log(house);
CREATE INDEX idx_merit_log_staff ON merit_log(staff_name);
CREATE INDEX idx_merit_log_category ON merit_log(r);

CREATE INDEX idx_students_house ON students(house);
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_parent_code ON students(parent_code);

CREATE INDEX idx_staff_email ON staff(email);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_assigned_house ON profiles(assigned_house);

CREATE INDEX idx_alert_history_status ON alert_history(status);
CREATE INDEX idx_alert_history_active ON alert_history(status) WHERE status = 'ACTIVE';

CREATE INDEX idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date);
CREATE INDEX idx_staff_analytics_email ON staff_analytics(staff_email);
CREATE INDEX idx_staff_analytics_outlier ON staff_analytics(outlier_flag) WHERE outlier_flag = TRUE;
```

---

**Document Version:** 1.0
**Last Updated:** January 2026
**Generated From:** League of Champions Codebase Analysis
