/**
 * A/B/C Student Intervention Framework Types
 * Implements the DAAIS behavioral management system
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const BEHAVIORAL_DOMAINS = {
  PRAYER_SPACE: 'prayer_space',
  HALLWAYS: 'hallways',
  LUNCH_RECESS: 'lunch_recess',
  RESPECT: 'respect',
} as const;

export type BehavioralDomainKey = typeof BEHAVIORAL_DOMAINS[keyof typeof BEHAVIORAL_DOMAINS];

export const LEVEL_A_INTERVENTION_TYPES = {
  PRE_CORRECT: 'pre_correct',
  POSITIVE_NARRATION: 'positive_narration',
  QUICK_REDIRECT: 'quick_redirect',
  REDO: 'redo',
  CHOICE_CONSEQUENCE: 'choice_consequence',
  PRIVATE_CHECK: 'private_check',
  MICRO_REPAIR: 'micro_repair',
  QUICK_REINFORCEMENT: 'quick_reinforcement',
} as const;

export type LevelAInterventionType = typeof LEVEL_A_INTERVENTION_TYPES[keyof typeof LEVEL_A_INTERVENTION_TYPES];

export const LEVEL_A_INTERVENTION_LABELS: Record<LevelAInterventionType, string> = {
  pre_correct: 'Pre-Correct',
  positive_narration: 'Positive Narration',
  quick_redirect: 'Quick Redirect',
  redo: '"Do It Again" Redo',
  choice_consequence: 'Choice + Consequence',
  private_check: 'Brief Private Check',
  micro_repair: 'Micro-Repair',
  quick_reinforcement: 'Quick Reinforcement',
};

export const LEVEL_A_OUTCOMES = {
  COMPLIED: 'complied',
  ESCALATED: 'escalated',
  PARTIAL: 'partial',
} as const;

export type LevelAOutcome = typeof LEVEL_A_OUTCOMES[keyof typeof LEVEL_A_OUTCOMES];

export const ESCALATION_TRIGGERS = {
  DEMERIT_ASSIGNED: 'demerit_assigned',
  THIRD_INCIDENT_10DAYS: '3rd_incident_10days',
  IGNORED_2PLUS_PROMPTS: 'ignored_2plus_prompts',
  PEER_IMPACT: 'peer_impact',
  SPACE_DISRUPTION: 'space_disruption',
  SAFETY_RISK: 'safety_risk',
  THRESHOLD_10_POINTS: 'threshold_10_points',
} as const;

export type EscalationTrigger = typeof ESCALATION_TRIGGERS[keyof typeof ESCALATION_TRIGGERS];

export const ESCALATION_TRIGGER_LABELS: Record<EscalationTrigger, string> = {
  demerit_assigned: 'Demerit Assigned',
  '3rd_incident_10days': '3rd Incident in 10 Days (Same Domain)',
  ignored_2plus_prompts: 'Ignored 2+ Prompts',
  peer_impact: 'Peer Impact',
  space_disruption: 'Shared Space Disruption',
  safety_risk: 'Safety Risk',
  threshold_10_points: '10+ SIS Demerit Points',
};

export const LEVEL_B_STATUS = {
  IN_PROGRESS: 'in_progress',
  MONITORING: 'monitoring',
  COMPLETED_SUCCESS: 'completed_success',
  COMPLETED_ESCALATED: 'completed_escalated',
  CANCELLED: 'cancelled',
} as const;

export type LevelBStatus = typeof LEVEL_B_STATUS[keyof typeof LEVEL_B_STATUS];

export const MONITORING_METHODS = {
  CHECKLIST: 'checklist',
  VERBAL_CHECK: 'verbal_check',
  WRITTEN_LOG: 'written_log',
} as const;

export type MonitoringMethod = typeof MONITORING_METHODS[keyof typeof MONITORING_METHODS];

export const LEVEL_C_TRIGGER_TYPES = {
  SAFETY_INCIDENT: 'safety_incident',
  NO_IMPROVEMENT_2_LEVEL_B: 'no_improvement_2_level_b',
  CHRONIC_PATTERN: 'chronic_pattern',
  POST_OSS_REENTRY: 'post_oss_reentry',
  THRESHOLD_20_POINTS: 'threshold_20_points',
  THRESHOLD_30_POINTS: 'threshold_30_points',
  THRESHOLD_35_POINTS: 'threshold_35_points',
  THRESHOLD_40_POINTS: 'threshold_40_points',
  ADMIN_REFERRAL: 'admin_referral',
} as const;

export type LevelCTriggerType = typeof LEVEL_C_TRIGGER_TYPES[keyof typeof LEVEL_C_TRIGGER_TYPES];

export const LEVEL_C_CASE_TYPES = {
  STANDARD: 'standard',
  LITE: 'lite',
  INTENSIVE: 'intensive',
} as const;

export type LevelCCaseType = typeof LEVEL_C_CASE_TYPES[keyof typeof LEVEL_C_CASE_TYPES];

export const ADMIN_RESPONSE_TYPES = {
  DETENTION: 'detention',
  ISS: 'iss',
  OSS: 'oss',
  BEHAVIOR_CONTRACT: 'behavior_contract',
  PARENT_CONFERENCE: 'parent_conference',
  OTHER: 'other',
} as const;

export type AdminResponseType = typeof ADMIN_RESPONSE_TYPES[keyof typeof ADMIN_RESPONSE_TYPES];

export const LEVEL_C_STATUS = {
  ACTIVE: 'active',
  CONTEXT_PACKET: 'context_packet',
  ADMIN_RESPONSE: 'admin_response',
  PENDING_REENTRY: 'pending_reentry',
  MONITORING: 'monitoring',
  CLOSED: 'closed',
} as const;

export type LevelCStatus = typeof LEVEL_C_STATUS[keyof typeof LEVEL_C_STATUS];

export const REENTRY_SOURCE_TYPES = {
  LEVEL_B: 'level_b',
  DETENTION: 'detention',
  ISS: 'iss',
  OSS: 'oss',
} as const;

export type ReentrySourceType = typeof REENTRY_SOURCE_TYPES[keyof typeof REENTRY_SOURCE_TYPES];

export const REENTRY_MONITORING_TYPES = {
  THREE_DAY: '3_day',
  FIVE_DAY: '5_day',
  TEN_DAY: '10_day',
} as const;

export type ReentryMonitoringType = typeof REENTRY_MONITORING_TYPES[keyof typeof REENTRY_MONITORING_TYPES];

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface BehavioralDomain {
  id: number;
  domain_key: BehavioralDomainKey;
  domain_name: string;
  description: string | null;
  expectations: string[];
  repair_menu_immediate: string[];
  repair_menu_restorative: string[];
  is_active: boolean;
  created_at: string;
}

export interface LevelAIntervention {
  id: string;
  student_id: string;
  staff_id: string | null;
  staff_name: string;
  domain_id: number | null;
  intervention_type: LevelAInterventionType;
  behavior_description: string | null;
  location: string | null;
  outcome: LevelAOutcome;
  escalated_to_b: boolean;
  is_repeated_same_day: boolean;
  affected_others: boolean;
  is_pattern_student: boolean;
  event_timestamp: string;
  created_at: string;
  // Joined fields
  domain?: BehavioralDomain;
  student?: { student_name: string; grade: number; section: string; house: string };
}

export interface LevelBIntervention {
  id: string;
  student_id: string;
  staff_id: string | null;
  staff_name: string;
  domain_id: number | null;
  escalation_trigger: EscalationTrigger;
  // 7-Step Protocol
  b1_regulate_completed: boolean;
  b1_regulate_notes: string | null;
  b2_pattern_naming_completed: boolean;
  b2_pattern_notes: string | null;
  b3_reflection_completed: boolean;
  b3_reflection_prompts_used: string[];
  b4_repair_completed: boolean;
  b4_repair_action_selected: string | null;
  b5_replacement_completed: boolean;
  b5_replacement_skill_practiced: string | null;
  b6_reset_goal_completed: boolean;
  b6_reset_goal: string | null;
  b6_reset_goal_timeline_days: number | null;
  b7_documentation_completed: boolean;
  // Monitoring
  monitoring_start_date: string | null;
  monitoring_end_date: string | null;
  monitoring_method: MonitoringMethod | null;
  daily_success_rates: Record<string, number>;
  final_success_rate: number | null;
  // Outcome
  status: LevelBStatus;
  escalated_to_c: boolean;
  escalation_reason: string | null;
  escalated_from_level_a_id: string | null;
  // Metadata
  conference_timestamp: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  domain?: BehavioralDomain;
  student?: { student_name: string; grade: number; section: string; house: string };
}

export interface LevelCCase {
  id: string;
  student_id: string;
  case_manager_id: string | null;
  case_manager_name: string | null;
  trigger_type: LevelCTriggerType;
  case_type: LevelCCaseType;
  domain_focus_id: number | null;
  // Context Packet
  incident_summary: string | null;
  pattern_review: string | null;
  environmental_factors: string[];
  prior_interventions_summary: string | null;
  context_packet_completed: boolean;
  // Admin Response
  admin_response_type: AdminResponseType | null;
  admin_response_details: string | null;
  consequence_start_date: string | null;
  consequence_end_date: string | null;
  admin_response_completed: boolean;
  // Support Plan & Re-entry
  support_plan_goal: string | null;
  support_plan_strategies: string[];
  adult_mentor_id: string | null;
  adult_mentor_name: string | null;
  repair_actions: RepairAction[];
  reentry_date: string | null;
  reentry_type: 'standard' | 'restricted';
  reentry_restrictions: string[];
  reentry_checklist: ReadinessChecklistItem[];
  reentry_planning_completed: boolean;
  // Monitoring
  monitoring_duration_days: number;
  monitoring_schedule: string[];
  review_dates: string[];
  daily_check_ins: DailyCheckIn[];
  // Closure
  closure_criteria: string | null;
  closure_date: string | null;
  outcome_status: 'closed_success' | 'closed_continued_support' | 'closed_escalated' | 'active' | null;
  outcome_notes: string | null;
  // Related
  escalated_from_level_b_ids: string[];
  sis_demerit_points_at_creation: number | null;
  status: LevelCStatus;
  // Metadata
  created_at: string;
  updated_at: string;
  // Joined fields
  domain?: BehavioralDomain;
  student?: { student_name: string; grade: number; section: string; house: string };
}

export interface ReentryProtocol {
  id: string;
  student_id: string;
  source_type: ReentrySourceType;
  level_b_id: string | null;
  level_c_id: string | null;
  reentry_date: string;
  reentry_time: string | null;
  receiving_teacher_id: string | null;
  receiving_teacher_name: string | null;
  readiness_checklist: ReadinessChecklistItem[];
  readiness_verified_by: string | null;
  readiness_verified_at: string | null;
  teacher_script: string | null;
  reset_goal_from_intervention: string | null;
  first_behavioral_rep_completed: boolean;
  monitoring_start_date: string | null;
  monitoring_end_date: string | null;
  monitoring_type: ReentryMonitoringType | null;
  monitoring_method: 'checklist' | 'check_in_out' | 'intensive' | null;
  daily_logs: DailyLog[];
  outcome: 'success' | 'partial' | 'escalated' | null;
  outcome_notes: string | null;
  completed_at: string | null;
  status: 'pending' | 'ready' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
  // Joined fields
  student?: { student_name: string; grade: number; section: string; house: string };
}

export interface StudentInterventionThreshold {
  id: number;
  threshold_name: string;
  description: string | null;
  demerit_points: number;
  intervention_level: 'level_b' | 'level_c_lite' | 'level_c' | 'level_c_reentry' | 'admin_decision';
  intervention_duration_days: number | null;
  additional_supports: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface InterventionAnalytics {
  id: string;
  snapshot_date: string;
  snapshot_type: 'daily' | 'weekly' | 'monthly';
  level_a_count: number;
  level_b_count: number;
  level_c_count: number;
  repeat_rate_prayer_space: number | null;
  repeat_rate_hallways: number | null;
  repeat_rate_lunch_recess: number | null;
  repeat_rate_respect: number | null;
  repeat_rate_overall: number | null;
  a_to_b_escalation_rate: number | null;
  b_to_c_escalation_rate: number | null;
  level_b_completion_rate: number | null;
  goal_achievement_rate: number | null;
  staff_variance_index: number | null;
  hot_zones: Record<string, number>;
  quality_score: number | null;
  created_at: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface ReadinessChecklistItem {
  item: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

export interface RepairAction {
  action: string;
  type: 'immediate' | 'restorative';
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  notes?: string;
}

export interface DailyCheckIn {
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  notes: string;
  success_rate?: number;
  logged_by: string;
}

export interface DailyLog {
  date: string;
  notes: string;
  success_indicators: string[];
  concerns: string[];
  logged_by: string;
  logged_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateLevelARequest {
  student_id: string;
  domain_id: number;
  intervention_type: LevelAInterventionType;
  behavior_description?: string;
  location?: string;
  outcome?: LevelAOutcome;
  is_repeated_same_day?: boolean;
  affected_others?: boolean;
}

export interface CreateLevelBRequest {
  student_id: string;
  domain_id: number;
  escalation_trigger: EscalationTrigger;
  escalated_from_level_a_id?: string;
}

export interface UpdateLevelBStepRequest {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  data: {
    // Step 1
    b1_regulate_completed?: boolean;
    b1_regulate_notes?: string;
    // Step 2
    b2_pattern_naming_completed?: boolean;
    b2_pattern_notes?: string;
    // Step 3
    b3_reflection_completed?: boolean;
    b3_reflection_prompts_used?: string[];
    // Step 4
    b4_repair_completed?: boolean;
    b4_repair_action_selected?: string;
    // Step 5
    b5_replacement_completed?: boolean;
    b5_replacement_skill_practiced?: string;
    // Step 6
    b6_reset_goal_completed?: boolean;
    b6_reset_goal?: string;
    b6_reset_goal_timeline_days?: number;
    // Step 7
    b7_documentation_completed?: boolean;
    monitoring_method?: MonitoringMethod;
  };
}

export interface CreateLevelCRequest {
  student_id: string;
  trigger_type: LevelCTriggerType;
  case_type?: LevelCCaseType;
  domain_focus_id?: number;
  escalated_from_level_b_ids?: string[];
  sis_demerit_points_at_creation?: number;
}

export interface CreateReentryRequest {
  student_id: string;
  source_type: ReentrySourceType;
  level_b_id?: string;
  level_c_id?: string;
  reentry_date: string;
  reentry_time?: string;
  receiving_teacher_id?: string;
  receiving_teacher_name?: string;
  monitoring_type: ReentryMonitoringType;
}

// ============================================================================
// DECISION TREE TYPES
// ============================================================================

export interface IncidentAssessment {
  student_id: string;
  domain_id: number;
  is_safety_incident: boolean;
  demerit_assigned: boolean;
  ignored_prompts: number;
  affected_peers: boolean;
  disrupted_space: boolean;
  is_safety_risk: boolean;
}

export type InterventionLevel = 'A' | 'B' | 'C';

export interface DecisionTreeResult {
  recommended_level: InterventionLevel;
  reasons: string[];
  is_pattern_student: boolean;
  prior_level_b_count: number;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface InterventionMetrics {
  total_level_a: number;
  total_level_b: number;
  total_level_c: number;
  distribution_healthy: boolean; // Many A, some B, few C
  repeat_rate_by_domain: Record<BehavioralDomainKey, number>;
  level_b_completion_rate: number;
  goal_achievement_rate: number;
  staff_variance_index: number;
  hot_zones: HotZone[];
}

export interface HotZone {
  location: string;
  time_period?: string;
  incident_count: number;
  primary_domain: BehavioralDomainKey;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface LevelBWorkflowState {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  intervention: LevelBIntervention;
  selectedDomain: BehavioralDomain | null;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface CaseManagementState {
  case: LevelCCase;
  currentPhase: 'context' | 'admin' | 'reentry' | 'monitoring' | 'closure';
  isSubmitting: boolean;
}
