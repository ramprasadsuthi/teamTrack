import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CONFIG } from '../config/index';
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
  BackupData,
  DashboardMetrics,
} from '../types/models';

export class StorageService {
  private dataDir: string;
  private writeLocks: Map<string, Promise<void>> = new Map();

  constructor(customDataDir?: string) {
    this.dataDir = customDataDir ? path.resolve(customDataDir) : CONFIG.DATA_DIR;
    this.initSync();
  }

  public getDataDir(): string {
    return this.dataDir;
  }

  private initSync(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    const backupsDir = path.join(this.dataDir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Initialize files if they do not exist
    this.ensureFileExists('team-members.json', []);
    this.ensureFileExists('tasks.json', []);
    this.ensureFileExists('goals.json', []);
    this.ensureFileExists('deadline-history.json', []);
    this.ensureFileExists('missed-deadlines.json', []);
    this.ensureFileExists('comments.json', []);
    this.ensureFileExists('activity-logs.json', []);
    this.ensureFileExists('notifications.json', []);
    this.ensureFileExists('settings.json', {
      organizationName: 'Apex Engineering & Operations',
      timezone: CONFIG.DEFAULT_TIMEZONE,
      defaultReminderLeadDays: 3,
      autoCheckIntervalMinutes: 5,
      allowWeekendDeadlines: true,
      updatedAt: new Date().toISOString(),
    });
  }

  private ensureFileExists(filename: string, defaultContent: any): void {
    const filePath = path.join(this.dataDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf-8');
    }
  }

  /**
   * Serializes operations per file using a lock queue to prevent lost updates from concurrent requests
   */
  public async withFileLock<T>(filename: string, fn: () => Promise<T>): Promise<T> {
    const prevLock = this.writeLocks.get(filename) || Promise.resolve();
    let releaseLock: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const nextLock = prevLock.then(() => currentLock).catch(() => currentLock);
    this.writeLocks.set(filename, nextLock);

    await prevLock;
    try {
      return await fn();
    } finally {
      releaseLock!();
    }
  }

  private async safeWriteFile<T>(filename: string, data: T): Promise<void> {
    const filePath = path.join(this.dataDir, filename);
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    const jsonContent = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(tmpPath, jsonContent, 'utf-8');
    await fs.promises.rename(tmpPath, filePath);
  }

  private async safeReadFile<T>(filename: string, fallback: T): Promise<T> {
    const filePath = path.join(this.dataDir, filename);
    try {
      if (!fs.existsSync(filePath)) {
        return fallback;
      }
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      if (!raw || raw.trim() === '') {
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`[StorageService] Error reading ${filename}:`, err);
      throw new Error(`Failed to read persistent file ${filename}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- Current Date helper based on configured timezone ---
  public getTodayDateString(timeZone = CONFIG.DEFAULT_TIMEZONE): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
    } catch {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    }
  }

  // --- Unique ID generator ---
  public generateId(prefix = 'id'): string {
    return `${prefix}_${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Date.now().toString(36) + Math.random().toString(36).slice(2, 6)}`;
  }

  // ==========================================
  // SETTINGS
  // ==========================================
  public async getSettings(): Promise<Settings> {
    return this.safeReadFile<Settings>('settings.json', {
      organizationName: 'Apex Engineering & Operations',
      timezone: CONFIG.DEFAULT_TIMEZONE,
      defaultReminderLeadDays: 3,
      autoCheckIntervalMinutes: 5,
      allowWeekendDeadlines: true,
      updatedAt: new Date().toISOString(),
    });
  }

  public async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated: Settings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.safeWriteFile('settings.json', updated);
    await this.logActivity('system', 'settings', 'Updated Organization Settings', `Updated settings: ${Object.keys(updates).join(', ')}`, 'Administrator');
    return updated;
  }

  // ==========================================
  // TEAM MEMBERS
  // ==========================================
  public async getAllTeamMembers(): Promise<TeamMember[]> {
    return this.safeReadFile<TeamMember[]>('team-members.json', []);
  }

  public async getTeamMemberById(id: string): Promise<TeamMember | null> {
    const members = await this.getAllTeamMembers();
    return members.find((m) => m.id === id) || null;
  }

  public async createTeamMember(memberData: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamMember> {
    const members = await this.getAllTeamMembers();

    // Check duplicate employeeCode
    if (members.some((m) => m.employeeCode.trim().toLowerCase() === memberData.employeeCode.trim().toLowerCase())) {
      throw new Error(`Employee code '${memberData.employeeCode}' is already registered.`);
    }

    // Check duplicate email
    if (memberData.email && members.some((m) => m.email.trim().toLowerCase() === memberData.email.trim().toLowerCase())) {
      throw new Error(`Email address '${memberData.email}' is already registered.`);
    }

    const now = new Date().toISOString();
    const newMember: TeamMember = {
      ...memberData,
      id: this.generateId('mem'),
      createdAt: now,
      updatedAt: now,
    };

    members.push(newMember);
    await this.safeWriteFile('team-members.json', members);
    await this.logActivity('member', newMember.id, 'Created Team Member', `Added ${newMember.fullName} (${newMember.designation})`, 'Administrator');
    return newMember;
  }

  public async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const members = await this.getAllTeamMembers();
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error(`Team member with ID '${id}' not found.`);
    }

    // Check unique employee code if updated
    if (updates.employeeCode && updates.employeeCode !== members[index].employeeCode) {
      if (members.some((m) => m.id !== id && m.employeeCode.trim().toLowerCase() === updates.employeeCode!.trim().toLowerCase())) {
        throw new Error(`Employee code '${updates.employeeCode}' is already registered.`);
      }
    }

    // Check unique email if updated
    if (updates.email && updates.email !== members[index].email) {
      if (members.some((m) => m.id !== id && m.email.trim().toLowerCase() === updates.email!.trim().toLowerCase())) {
        throw new Error(`Email address '${updates.email}' is already registered.`);
      }
    }

    const now = new Date().toISOString();
    members[index] = {
      ...members[index],
      ...updates,
      updatedAt: now,
    };

    await this.safeWriteFile('team-members.json', members);
    await this.logActivity('member', id, 'Updated Team Member', `Updated details for ${members[index].fullName}`, 'Administrator');
    return members[index];
  }

  public async setTeamMemberStatus(id: string, status: 'Active' | 'Inactive'): Promise<TeamMember> {
    return this.updateTeamMember(id, { status });
  }

  // ==========================================
  // TASKS
  // ==========================================
  public async getAllTasks(): Promise<Task[]> {
    return this.safeReadFile<Task[]>('tasks.json', []);
  }

  public async getTaskById(id: string): Promise<Task | null> {
    const tasks = await this.getAllTasks();
    return tasks.find((t) => t.id === id) || null;
  }

  public async createTask(taskData: {
    title: string;
    description: string;
    assigneeIds: string[];
    department: string;
    project: string;
    category: string;
    priority: Task['priority'];
    status?: Task['status'];
    startDate?: string;
    targetDate: string; // Used for both original and current
    reminderDate?: string;
    estimatedEffortHours?: number;
    progress?: number;
    linkedGoalIds?: string[];
    adminRemarks?: string;
    createdBy?: string;
  }): Promise<Task> {
    const tasks = await this.getAllTasks();
    const now = new Date().toISOString();
    const today = this.getTodayDateString();

    const isCompleted = taskData.status === 'Completed';

    const newTask: Task = {
      id: this.generateId('task'),
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      assigneeIds: taskData.assigneeIds || [],
      department: taskData.department || 'General',
      project: taskData.project || 'General',
      category: taskData.category || 'Operational',
      priority: taskData.priority || 'Medium',
      status: taskData.status || 'To Do',
      createdDate: today,
      startDate: taskData.startDate || today,
      originalTargetDate: taskData.targetDate, // Immutable
      currentTargetDate: taskData.targetDate,
      reminderDate: taskData.reminderDate || undefined,
      estimatedEffortHours: taskData.estimatedEffortHours || 0,
      actualEffortHours: 0,
      progress: isCompleted ? 100 : (taskData.progress || 0),
      linkedGoalIds: taskData.linkedGoalIds || [],
      adminRemarks: taskData.adminRemarks || '',
      createdBy: taskData.createdBy || 'Administrator',
      createdAt: now,
      updatedAt: now,
      completedAt: isCompleted ? now : null,
      deadlineRevisionCount: 0,
      missedDeadlineCount: 0,
    };

    tasks.push(newTask);
    await this.safeWriteFile('tasks.json', tasks);

    await this.logActivity('task', newTask.id, 'Created Task', `Created task "${newTask.title}" due ${newTask.currentTargetDate}`, newTask.createdBy);
    await this.createNotification({
      title: `New Task Assigned: ${newTask.title}`,
      description: `Task has been assigned and scheduled for deadline ${newTask.currentTargetDate}.`,
      entityType: 'task',
      entityId: newTask.id,
      severity: 'info',
    });

    return newTask;
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    return this.withFileLock('tasks.json', async () => {
      const tasks = await this.safeReadFile<Task[]>('tasks.json', []);
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error(`Task with ID '${id}' not found.`);
      }

      const currentTask = tasks[index];
      const now = new Date().toISOString();

      // Critical Business Rule: NEVER overwrite originalTargetDate
      const safeUpdates = { ...updates };
      delete safeUpdates.originalTargetDate;
      delete safeUpdates.id;

      // Handle status transitions
      let completedAt = currentTask.completedAt;
      let progress = safeUpdates.progress !== undefined ? safeUpdates.progress : currentTask.progress;

      if (safeUpdates.status === 'Completed') {
        progress = 100;
        if (!completedAt) {
          completedAt = now;
        }
      } else if (safeUpdates.status && safeUpdates.status !== 'Completed' && currentTask.status === 'Completed') {
        // Reopening completed task
        completedAt = null;
        if (progress === 100) {
          progress = 80; // Reopened, not completed
        }
      }

      tasks[index] = {
        ...currentTask,
        ...safeUpdates,
        progress,
        completedAt,
        updatedAt: now,
      };

      await this.safeWriteFile('tasks.json', tasks);
      await this.logActivity('task', id, 'Updated Task', `Updated details for task "${tasks[index].title}"`, 'Administrator');

      if (safeUpdates.status === 'Completed' && currentTask.status !== 'Completed') {
        await this.createNotification({
          title: `Task Completed: ${tasks[index].title}`,
          description: `Task was marked completed with 100% progress.`,
          entityType: 'task',
          entityId: id,
          severity: 'success',
        });
      }

      return tasks[index];
    });
  }

  /**
   * Reschedule a task deadline.
   * Business rule: Requires new target date and a reason.
   * Maintains immutable history in deadline-history.json.
   * Checks if deadline was already overdue.
   */
  public async rescheduleTask(params: {
    taskId: string;
    newTargetDate: string;
    reason: string;
    adminRemarks?: string;
    rescheduledBy?: string;
  }): Promise<{ task: Task; historyItem: DeadlineHistoryItem }> {
    const tasks = await this.getAllTasks();
    const index = tasks.findIndex((t) => t.id === params.taskId);
    if (index === -1) {
      throw new Error(`Task with ID '${params.taskId}' not found.`);
    }

    if (!params.newTargetDate || !params.newTargetDate.trim()) {
      throw new Error('New target date is required.');
    }
    if (!params.reason || !params.reason.trim()) {
      throw new Error('Reason for rescheduling is mandatory.');
    }

    const currentTask = tasks[index];
    const previousDate = currentTask.currentTargetDate;
    const today = this.getTodayDateString();
    const wasOverdue = previousDate < today && currentTask.status !== 'Completed';

    const now = new Date().toISOString();
    const historyItem: DeadlineHistoryItem = {
      id: this.generateId('dlh'),
      taskId: currentTask.id,
      previousTargetDate: previousDate,
      newTargetDate: params.newTargetDate,
      revisionTimestamp: now,
      reason: params.reason.trim(),
      rescheduledBy: params.rescheduledBy || 'Administrator',
      adminRemarks: params.adminRemarks || '',
      wasOverdueAtReschedule: wasOverdue,
    };

    // Save to deadline-history.json
    const deadlineHistory = await this.getAllDeadlineHistory();
    deadlineHistory.push(historyItem);
    await this.safeWriteFile('deadline-history.json', deadlineHistory);

    // Update Task
    tasks[index] = {
      ...currentTask,
      currentTargetDate: params.newTargetDate,
      deadlineRevisionCount: (currentTask.deadlineRevisionCount || 0) + 1,
      adminRemarks: params.adminRemarks || currentTask.adminRemarks,
      updatedAt: now,
    };
    await this.safeWriteFile('tasks.json', tasks);

    // Activity log & Notification
    await this.logActivity(
      'task',
      currentTask.id,
      'Rescheduled Task Deadline',
      `Moved target date from ${previousDate} to ${params.newTargetDate}. Reason: ${params.reason}`,
      params.rescheduledBy || 'Administrator'
    );

    await this.createNotification({
      title: `Task Rescheduled: ${currentTask.title}`,
      description: `Target date changed from ${previousDate} to ${params.newTargetDate}. Reason: ${params.reason}`,
      entityType: 'task',
      entityId: currentTask.id,
      severity: 'warning',
    });

    return { task: tasks[index], historyItem };
  }

  public async deleteTask(id: string): Promise<boolean> {
    const tasks = await this.getAllTasks();
    const target = tasks.find((t) => t.id === id);
    if (!target) return false;

    const filtered = tasks.filter((t) => t.id !== id);
    await this.safeWriteFile('tasks.json', filtered);
    await this.logActivity('task', id, 'Deleted Task', `Deleted task "${target.title}"`, 'Administrator');
    return true;
  }

  // ==========================================
  // DEADLINE HISTORY & MISSED DEADLINES
  // ==========================================
  public async getAllDeadlineHistory(): Promise<DeadlineHistoryItem[]> {
    return this.safeReadFile<DeadlineHistoryItem[]>('deadline-history.json', []);
  }

  public async getDeadlineHistoryForTask(taskId: string): Promise<DeadlineHistoryItem[]> {
    const history = await this.getAllDeadlineHistory();
    return history.filter((h) => h.taskId === taskId).sort((a, b) => b.revisionTimestamp.localeCompare(a.revisionTimestamp));
  }

  public async getAllMissedDeadlineEvents(): Promise<MissedDeadlineEvent[]> {
    return this.safeReadFile<MissedDeadlineEvent[]>('missed-deadlines.json', []);
  }

  public async getMissedDeadlinesForTask(taskId: string): Promise<MissedDeadlineEvent[]> {
    const events = await this.getAllMissedDeadlineEvents();
    return events.filter((e) => e.taskId === taskId).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  /**
   * Records a missed deadline event exactly once for a given task and target date.
   * Returns true if newly recorded, false if already recorded.
   */
  public async recordMissedDeadlineEvent(params: {
    taskId: string;
    targetDateMissed: string;
    reasonRecorded?: string;
    notes?: string;
  }): Promise<boolean> {
    const events = await this.getAllMissedDeadlineEvents();
    // Unique key check: taskId + targetDateMissed
    const alreadyRecorded = events.some(
      (e) => e.taskId === params.taskId && e.targetDateMissed === params.targetDateMissed
    );

    if (alreadyRecorded) {
      return false;
    }

    const now = new Date().toISOString();
    const newEvent: MissedDeadlineEvent = {
      id: this.generateId('mdl'),
      taskId: params.taskId,
      targetDateMissed: params.targetDateMissed,
      detectedAt: now,
      reasonRecorded: params.reasonRecorded,
      notes: params.notes,
    };

    events.push(newEvent);
    await this.safeWriteFile('missed-deadlines.json', events);

    // Increment missedDeadlineCount on the task
    const tasks = await this.getAllTasks();
    const taskIndex = tasks.findIndex((t) => t.id === params.taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex].missedDeadlineCount = (tasks[taskIndex].missedDeadlineCount || 0) + 1;
      tasks[taskIndex].updatedAt = now;
      await this.safeWriteFile('tasks.json', tasks);

      await this.createNotification({
        title: `Missed Target Deadline: ${tasks[taskIndex].title}`,
        description: `Task missed target date ${params.targetDateMissed}. Target needs rescheduling or completion.`,
        entityType: 'task',
        entityId: tasks[taskIndex].id,
        severity: 'danger',
      });

      await this.logActivity(
        'task',
        tasks[taskIndex].id,
        'Recorded Missed Deadline',
        `Automated system recorded missed deadline for target date ${params.targetDateMissed}`,
        'System Engine'
      );
    }

    return true;
  }

  // ==========================================
  // GOALS & TARGETS
  // ==========================================
  public async getAllGoals(): Promise<Goal[]> {
    return this.safeReadFile<Goal[]>('goals.json', []);
  }

  public async getGoalById(id: string): Promise<Goal | null> {
    const goals = await this.getAllGoals();
    return goals.find((g) => g.id === id) || null;
  }

  public async createGoal(goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const goals = await this.getAllGoals();
    const now = new Date().toISOString();

    const progress = Math.min(100, Math.round((goalData.currentAchievementValue / (goalData.targetValue || 1)) * 100));
    let status = goalData.status;
    if (progress >= 100) {
      status = 'Achieved';
    } else if (progress > 0 && status === 'Not Started') {
      status = 'In Progress';
    }

    const newGoal: Goal = {
      ...goalData,
      id: this.generateId('goal'),
      progress,
      status,
      createdAt: now,
      updatedAt: now,
    };

    goals.push(newGoal);
    await this.safeWriteFile('goals.json', goals);
    await this.logActivity('goal', newGoal.id, 'Created Goal', `Created goal: "${newGoal.title}" (${newGoal.targetValue} ${newGoal.unitOfMeasurement})`, 'Administrator');
    return newGoal;
  }

  public async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    const goals = await this.getAllGoals();
    const index = goals.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new Error(`Goal with ID '${id}' not found.`);
    }

    const currentGoal = goals[index];
    const now = new Date().toISOString();

    const currentAchievement = updates.currentAchievementValue !== undefined ? updates.currentAchievementValue : currentGoal.currentAchievementValue;
    const targetValue = updates.targetValue !== undefined ? updates.targetValue : currentGoal.targetValue;
    const progress = Math.min(100, Math.round((currentAchievement / (targetValue || 1)) * 100));

    let status = updates.status !== undefined ? updates.status : currentGoal.status;
    if (progress >= 100 && status !== 'Archived') {
      status = 'Achieved';
    }

    goals[index] = {
      ...currentGoal,
      ...updates,
      currentAchievementValue: currentAchievement,
      targetValue,
      progress,
      status,
      updatedAt: now,
    };

    await this.safeWriteFile('goals.json', goals);
    await this.logActivity('goal', id, 'Updated Goal', `Updated progress/details for goal "${goals[index].title}"`, 'Administrator');
    return goals[index];
  }

  public async deleteGoal(id: string): Promise<boolean> {
    const goals = await this.getAllGoals();
    const target = goals.find((g) => g.id === id);
    if (!target) return false;

    const filtered = goals.filter((g) => g.id !== id);
    await this.safeWriteFile('goals.json', filtered);
    await this.logActivity('goal', id, 'Deleted Goal', `Deleted goal "${target.title}"`, 'Administrator');
    return true;
  }

  // ==========================================
  // COMMENTS
  // ==========================================
  public async getCommentsForTask(taskId: string): Promise<Comment[]> {
    const comments = await this.safeReadFile<Comment[]>('comments.json', []);
    return comments.filter((c) => c.taskId === taskId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public async addComment(params: {
    taskId: string;
    authorName?: string;
    authorRole?: string;
    content: string;
  }): Promise<Comment> {
    const comments = await this.safeReadFile<Comment[]>('comments.json', []);
    const newComment: Comment = {
      id: this.generateId('comment'),
      taskId: params.taskId,
      authorName: params.authorName || 'Administrator',
      authorRole: params.authorRole || 'Manager',
      content: params.content.trim(),
      createdAt: new Date().toISOString(),
    };

    comments.push(newComment);
    await this.safeWriteFile('comments.json', comments);
    await this.logActivity('task', params.taskId, 'Added Comment', `Added comment on task`, newComment.authorName);
    return newComment;
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  public async getAllNotifications(): Promise<Notification[]> {
    const notifs = await this.safeReadFile<Notification[]>('notifications.json', []);
    return notifs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    const notifs = await this.getAllNotifications();
    const newNotif: Notification = {
      ...data,
      id: this.generateId('notif'),
      createdAt: new Date().toISOString(),
      read: false,
    };
    notifs.unshift(newNotif);
    // Keep max 200 notifications to prevent unbounded growth
    const trimmed = notifs.slice(0, 200);
    await this.safeWriteFile('notifications.json', trimmed);
    return newNotif;
  }

  public async markNotificationRead(id: string): Promise<boolean> {
    const notifs = await this.getAllNotifications();
    const item = notifs.find((n) => n.id === id);
    if (!item) return false;
    item.read = true;
    await this.safeWriteFile('notifications.json', notifs);
    return true;
  }

  public async markAllNotificationsRead(): Promise<number> {
    const notifs = await this.getAllNotifications();
    let count = 0;
    notifs.forEach((n) => {
      if (!n.read) {
        n.read = true;
        count++;
      }
    });
    await this.safeWriteFile('notifications.json', notifs);
    return count;
  }

  // ==========================================
  // ACTIVITY LOGS
  // ==========================================
  public async getActivityLogs(limit = 100): Promise<ActivityLog[]> {
    const logs = await this.safeReadFile<ActivityLog[]>('activity-logs.json', []);
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }

  public async logActivity(
    entityType: ActivityLog['entityType'],
    entityId: string,
    action: string,
    details: string,
    actor = 'Administrator'
  ): Promise<ActivityLog> {
    const logs = await this.safeReadFile<ActivityLog[]>('activity-logs.json', []);
    const newLog: ActivityLog = {
      id: this.generateId('act'),
      entityType,
      entityId,
      action,
      details,
      timestamp: new Date().toISOString(),
      actor,
    };
    logs.unshift(newLog);
    const trimmed = logs.slice(0, 500);
    await this.safeWriteFile('activity-logs.json', trimmed);
    return newLog;
  }

  // ==========================================
  // DASHBOARD METRICS CALCULATION
  // ==========================================
  public async getDashboardMetrics(timeZone = CONFIG.DEFAULT_TIMEZONE): Promise<DashboardMetrics> {
    const tasks = await this.getAllTasks();
    const members = await this.getAllTeamMembers();
    const goals = await this.getAllGoals();
    const missedEvents = await this.getAllMissedDeadlineEvents();

    const today = this.getTodayDateString(timeZone);

    const totalTasks = tasks.length;
    const toDo = tasks.filter((t) => t.status === 'To Do').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const onHold = tasks.filter((t) => t.status === 'On Hold').length;

    // Currently Overdue: incomplete tasks whose current target date is before today
    const currentlyOverdue = tasks.filter(
      (t) => t.status !== 'Completed' && t.currentTargetDate < today
    ).length;

    // Total Missed Targets: unique missed deadline events across server records
    const totalMissedTargets = missedEvents.length;

    // Active Team Members: non-deactivated
    const activeTeamMembers = members.filter((m) => m.status === 'Active').length;

    // Overall Completion Rate: (completed / total) * 100
    const overallCompletionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    // Goals Achieved: status === 'Achieved' or progress >= 100
    const goalsAchieved = goals.filter((g) => g.status === 'Achieved' || g.progress >= 100).length;

    return {
      totalTasks,
      toDo,
      inProgress,
      completed,
      onHold,
      currentlyOverdue,
      totalMissedTargets,
      activeTeamMembers,
      overallCompletionRate,
      goalsAchieved,
      totalGoals: goals.length,
    };
  }

  // ==========================================
  // BACKUP EXPORT & RESTORE
  // ==========================================
  public async exportBackup(): Promise<BackupData> {
    const [members, tasks, goals, deadlineHistory, missedDeadlines, comments, activityLogs, notifications, settings] =
      await Promise.all([
        this.getAllTeamMembers(),
        this.getAllTasks(),
        this.getAllGoals(),
        this.getAllDeadlineHistory(),
        this.getAllMissedDeadlineEvents(),
        this.safeReadFile<Comment[]>('comments.json', []),
        this.getActivityLogs(500),
        this.getAllNotifications(),
        this.getSettings(),
      ]);

    const backup: BackupData = {
      schemaVersion: CONFIG.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      systemInfo: {
        app: 'TeamTrack',
        version: '1.0.0',
        environment: CONFIG.NODE_ENV,
      },
      members,
      tasks,
      goals,
      deadlineHistory,
      missedDeadlines,
      comments,
      activityLogs,
      notifications,
      settings,
    };

    return backup;
  }

  public validateBackup(data: any): { valid: boolean; errors: string[]; summary?: any } {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Invalid backup payload: must be a valid JSON object.'] };
    }

    if (!data.schemaVersion) {
      errors.push('Missing schemaVersion in backup file.');
    }
    if (!Array.isArray(data.members)) {
      errors.push('Invalid or missing members array.');
    }
    if (!Array.isArray(data.tasks)) {
      errors.push('Invalid or missing tasks array.');
    }
    if (!Array.isArray(data.goals)) {
      errors.push('Invalid or missing goals array.');
    }
    if (!Array.isArray(data.deadlineHistory)) {
      errors.push('Invalid or missing deadlineHistory array.');
    }
    if (!Array.isArray(data.missedDeadlines)) {
      errors.push('Invalid or missing missedDeadlines array.');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Check basic record structure
    for (const m of data.members) {
      if (!m.id || !m.fullName || !m.employeeCode) {
        errors.push(`Invalid member record found: missing id, fullName, or employeeCode (${JSON.stringify(m)})`);
        break;
      }
    }

    for (const t of data.tasks) {
      if (!t.id || !t.title || !t.originalTargetDate || !t.currentTargetDate) {
        errors.push(`Invalid task record found: missing id, title, or target date (${JSON.stringify(t)})`);
        break;
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      summary: {
        schemaVersion: data.schemaVersion,
        exportedAt: data.exportedAt,
        membersCount: data.members.length,
        tasksCount: data.tasks.length,
        goalsCount: data.goals.length,
        deadlineHistoryCount: data.deadlineHistory.length,
        missedDeadlinesCount: data.missedDeadlines.length,
      },
    };
  }

  public async restoreBackup(data: BackupData): Promise<{ success: boolean; message: string }> {
    const validation = this.validateBackup(data);
    if (!validation.valid) {
      throw new Error(`Backup validation failed: ${validation.errors.join('; ')}`);
    }

    // Step 1: Create automatic safety pre-restore backup
    const preRestore = await this.exportBackup();
    const preRestoreFilename = `pre-restore-${Date.now()}.json`;
    const preRestorePath = path.join(this.dataDir, 'backups', preRestoreFilename);
    await fs.promises.writeFile(preRestorePath, JSON.stringify(preRestore, null, 2), 'utf-8');

    // Step 2: Safely write new entities
    await this.safeWriteFile('team-members.json', data.members);
    await this.safeWriteFile('tasks.json', data.tasks);
    await this.safeWriteFile('goals.json', data.goals);
    await this.safeWriteFile('deadline-history.json', data.deadlineHistory);
    await this.safeWriteFile('missed-deadlines.json', data.missedDeadlines);
    await this.safeWriteFile('comments.json', data.comments || []);
    await this.safeWriteFile('activity-logs.json', data.activityLogs || []);
    await this.safeWriteFile('notifications.json', data.notifications || []);
    if (data.settings) {
      await this.safeWriteFile('settings.json', data.settings);
    }

    await this.logActivity(
      'backup',
      'system',
      'Restored System Backup',
      `Restored ${data.tasks.length} tasks and ${data.members.length} members. Pre-restore backup saved to ${preRestoreFilename}.`,
      'Administrator'
    );

    return {
      success: true,
      message: `Successfully restored backup. Pre-restore backup saved to ${preRestoreFilename}.`,
    };
  }

  // ==========================================
  // RESET / CLEAR ALL DATA
  // ==========================================
  public async clearAllData(): Promise<void> {
    await this.safeWriteFile('team-members.json', []);
    await this.safeWriteFile('tasks.json', []);
    await this.safeWriteFile('goals.json', []);
    await this.safeWriteFile('deadline-history.json', []);
    await this.safeWriteFile('missed-deadlines.json', []);
    await this.safeWriteFile('comments.json', []);
    await this.safeWriteFile('activity-logs.json', []);
    await this.safeWriteFile('notifications.json', []);
  }
}

export const storage = new StorageService();
