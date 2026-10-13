export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'To Do' | 'In Progress' | 'On Hold' | 'Completed';
export type MemberStatus = 'Active' | 'Inactive';

export interface TeamMember {
  id: string;
  fullName: string;
  employeeCode: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  joiningDate: string; // YYYY-MM-DD
  status: MemberStatus;
  avatarUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeIds: string[];
  department: string;
  project: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdDate: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  originalTargetDate: string; // YYYY-MM-DD - immutable once set
  currentTargetDate: string; // YYYY-MM-DD
  reminderDate?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  estimatedEffortHours?: number;
  actualEffortHours?: number;
  progress: number; // 0 - 100
  linkedGoalIds: string[];
  adminRemarks?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deadlineRevisionCount: number;
  missedDeadlineCount: number;
}

export interface DeadlineHistoryItem {
  id: string;
  taskId: string;
  previousTargetDate: string;
  newTargetDate: string;
  revisionTimestamp: string;
  reason: string;
  rescheduledBy: string;
  adminRemarks?: string;
  wasOverdueAtReschedule: boolean;
}

export interface MissedDeadlineEvent {
  id: string;
  taskId: string;
  targetDateMissed: string; // The exact target date that passed
  detectedAt: string;
  reasonRecorded?: string;
  notes?: string;
}

export type GoalCategory = 'Individual' | 'Team' | 'Project' | 'Quarterly';
export type GoalStatus = 'Not Started' | 'In Progress' | 'Achieved' | 'At Risk' | 'Overdue' | 'Archived';

export interface Goal {
  id: string;
  title: string;
  description: string;
  ownerIds: string[];
  department: string;
  project: string;
  category: GoalCategory;
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  targetValue: number;
  currentAchievementValue: number;
  unitOfMeasurement: string;
  progress: number; // 0 - 100
  status: GoalStatus;
  linkedTaskIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  entityType: 'task' | 'member' | 'goal' | 'system' | 'backup';
  entityId: string;
  action: string;
  details: string;
  timestamp: string;
  actor: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  entityType: 'task' | 'goal' | 'member' | 'system';
  entityId: string;
  createdAt: string;
  read: boolean;
  severity: 'info' | 'warning' | 'danger' | 'success';
}

export interface Settings {
  organizationName: string;
  timezone: string; // Default 'Asia/Kolkata'
  defaultReminderLeadDays: number;
  autoCheckIntervalMinutes: number;
  allowWeekendDeadlines: boolean;
  updatedAt: string;
}

export interface BackupData {
  schemaVersion: string;
  exportedAt: string;
  systemInfo: {
    app: string;
    version: string;
    environment: string;
  };
  members: TeamMember[];
  tasks: Task[];
  goals: Goal[];
  deadlineHistory: DeadlineHistoryItem[];
  missedDeadlines: MissedDeadlineEvent[];
  comments: Comment[];
  activityLogs: ActivityLog[];
  notifications: Notification[];
  settings: Settings;
}

export interface DashboardMetrics {
  totalTasks: number;
  toDo: number;
  inProgress: number;
  completed: number;
  onHold: number;
  currentlyOverdue: number;
  totalMissedTargets: number;
  activeTeamMembers: number;
  overallCompletionRate: number;
  goalsAchieved: number;
  totalGoals: number;
}
