-- Implementation Health Tables Migration
-- Run this SQL in the Supabase SQL Editor to create the required tables

-- decision_log: Tracks decisions made during huddle meetings
CREATE TABLE IF NOT EXISTS decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_end_date date NOT NULL,
  due_date date,
  status text DEFAULT 'Pending',
  owner text,
  action_type text,
  title text,
  outcome_tag text,
  notes text,
  selected_actions jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- huddle_log: Tracks huddle meetings
CREATE TABLE IF NOT EXISTS huddle_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_end_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- action_menu: Predefined action items for decision logging
CREATE TABLE IF NOT EXISTS action_menu (
  id serial PRIMARY KEY,
  title text NOT NULL,
  category text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_menu ENABLE ROW LEVEL SECURITY;

-- Policies for decision_log
CREATE POLICY "Allow authenticated read on decision_log" ON decision_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on decision_log" ON decision_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on decision_log" ON decision_log
  FOR UPDATE TO authenticated USING (true);

-- Policies for huddle_log
CREATE POLICY "Allow authenticated read on huddle_log" ON huddle_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on huddle_log" ON huddle_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Policies for action_menu
CREATE POLICY "Allow authenticated read on action_menu" ON action_menu
  FOR SELECT TO authenticated USING (true);

-- Insert default action menu items
INSERT INTO action_menu (title, category) VALUES
  ('Review participation rates', 'Adoption'),
  ('Schedule staff training', 'Adoption'),
  ('Send reminder emails', 'Consistency'),
  ('Update huddle schedule', 'Consistency'),
  ('Clean up roster data', 'Governance'),
  ('Review missing notes', 'Governance'),
  ('Follow up on overdue actions', 'Insight'),
  ('Log new decisions', 'Insight')
ON CONFLICT DO NOTHING;

-- Grant access to service role
GRANT ALL ON decision_log TO service_role;
GRANT ALL ON huddle_log TO service_role;
GRANT ALL ON action_menu TO service_role;
GRANT USAGE, SELECT ON SEQUENCE action_menu_id_seq TO service_role;
