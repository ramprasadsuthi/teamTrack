import {
  TeamMember,
  Task,
  Goal,
  DeadlineHistoryItem,
  MissedDeadlineEvent,
  Comment,
  ActivityLog,
  Notification,
  Settings,
  DashboardMetrics,
  BackupData,
} from '../../backend/src/types/models';

export type {
  TeamMember,
  Task,
  Goal,
  DeadlineHistoryItem,
  MissedDeadlineEvent,
  Comment,
  ActivityLog,
  Notification,
  Settings,
  DashboardMetrics,
  BackupData,
};

const BASE_URL = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errMessage = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      if (errData && errData.error) {
        errMessage = errData.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  return res.json();
}

export const api = {
  // Health
  getHealth: () => fetchJson<{ status: string; uptime: number; timezone: string }>('/health'),
  checkDeadlines: () => fetchJson<{ success: boolean; result: any }>('/system/check-deadlines', { method: 'POST' }),

  // Dashboard
  getDashboard: () =>
    fetchJson<{
      metrics: DashboardMetrics;
      today: string;
      timezone: string;
      statusBreakdown: Record<string, number>;
      priorityBreakdown: Record<string, number>;
      upcomingTasks: Task[];
      missedByMember: { memberName: string; missedCount: number; activeTaskCount: number }[];
      recentActivity: ActivityLog[];
      goalsSummary: { total: number; achieved: number; inProgress: number; overdue: number };
    }>('/dashboard'),

  getDashboardTrends: () =>
    fetchJson<{
      completionTrends: Record<string, number>;
      totalCompleted: number;
      totalMissedHistorical: number;
    }>('/dashboard/trends'),

  // Team Members
  getTeamMembers: () =>
    fetchJson<
      (TeamMember & {
        stats: {
          totalAssigned: number;
          completed: number;
          inProgress: number;
          onHold: number;
          toDo: number;
          overdue: number;
          missedCount: number;
          completionRate: number;
          goalsCount: number;
        };
      })[]
    >('/team-members'),

  getTeamMember: (id: string) => fetchJson<TeamMember>(`/team-members/${id}`),

  createTeamMember: (data: Partial<TeamMember>) =>
    fetchJson<TeamMember>('/team-members', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTeamMember: (id: string, data: Partial<TeamMember>) =>
    fetchJson<TeamMember>(`/team-members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  setTeamMemberStatus: (id: string, status: 'Active' | 'Inactive') =>
    fetchJson<TeamMember>(`/team-members/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Tasks
  getTasks: () =>
    fetchJson<(Task & { isOverdue?: boolean; daysOverdue?: number })[]>('/tasks'),

  getTask: (id: string) =>
    fetchJson<
      Task & {
        isOverdue?: boolean;
        daysOverdue?: number;
        deadlineHistory: DeadlineHistoryItem[];
        missedDeadlines: MissedDeadlineEvent[];
        comments: Comment[];
      }
    >(`/tasks/${id}`),

  createTask: (data: any) =>
    fetchJson<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: Partial<Task>) =>
    fetchJson<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateTaskStatus: (id: string, status: Task['status']) =>
    fetchJson<Task>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateTaskProgress: (id: string, progress: number) =>
    fetchJson<Task>(`/tasks/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ progress }),
    }),

  rescheduleTask: (id: string, data: { newTargetDate: string; reason: string; adminRemarks?: string }) =>
    fetchJson<{ task: Task; historyItem: DeadlineHistoryItem }>(`/tasks/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteTask: (id: string) =>
    fetchJson<{ success: boolean }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  addTaskComment: (taskId: string, content: string, authorName?: string) =>
    fetchJson<Comment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, authorName }),
    }),

  // Goals
  getGoals: () =>
    fetchJson<
      (Goal & {
        linkedTasksSummary: { total: number; completed: number };
      })[]
    >('/goals'),

  getGoal: (id: string) => fetchJson<Goal>(`/goals/${id}`),

  createGoal: (data: Partial<Goal>) =>
    fetchJson<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateGoal: (id: string, data: Partial<Goal>) =>
    fetchJson<Goal>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteGoal: (id: string) =>
    fetchJson<{ success: boolean }>(`/goals/${id}`, {
      method: 'DELETE',
    }),

  // Notifications
  getNotifications: () => fetchJson<Notification[]>('/notifications'),
  markNotificationRead: (id: string) =>
    fetchJson<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    fetchJson<{ success: boolean; updatedCount: number }>('/notifications/read-all', { method: 'POST' }),

  // Activity Logs
  getActivityLogs: (limit = 100) => fetchJson<ActivityLog[]>(`/activity?limit=${limit}`),

  // Reports
  getTeamPerformanceReport: () => fetchJson<any>('/reports/team-performance'),
  getOverdueTasksReport: () => fetchJson<any[]>('/reports/overdue'),
  getMissedDeadlinesReport: () => fetchJson<any[]>('/reports/missed-deadlines'),

  // Backup & Restore
  exportBackup: () => fetchJson<BackupData>('/backup/export'),
  validateBackup: (data: any) =>
    fetchJson<{ valid: boolean; errors: string[]; summary?: any }>('/backup/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  restoreBackup: (data: BackupData) =>
    fetchJson<{ success: boolean; message: string }>('/backup/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Settings & Sample Data
  getSettings: () => fetchJson<Settings>('/settings'),
  updateSettings: (data: Partial<Settings>) =>
    fetchJson<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  loadSampleData: () => fetchJson<{ success: boolean; message: string; result: any }>('/sample-data/load', { method: 'POST' }),
  clearData: () => fetchJson<{ success: boolean; message: string }>('/sample-data/clear', { method: 'POST' }),
};
