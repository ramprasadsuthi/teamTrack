import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../services/storage';
import { deadlineEngine } from '../services/deadlineEngine';
import { loadSampleData } from '../services/sampleData';
import { CONFIG } from '../config/index';

export const apiRouter = Router();

// ==========================================
// 1. HEALTH & SYSTEM
// ==========================================
apiRouter.get('/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'TeamTrack',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    storageDir: storage.getDataDir(),
    timezone: CONFIG.DEFAULT_TIMEZONE,
  });
});

apiRouter.post('/system/check-deadlines', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deadlineEngine.checkDeadlines();
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. DASHBOARD
// ==========================================
apiRouter.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await storage.getSettings();
    const metrics = await storage.getDashboardMetrics(settings.timezone);
    const tasks = await storage.getAllTasks();
    const members = await storage.getAllTeamMembers();
    const goals = await storage.getAllGoals();
    const missedDeadlines = await storage.getAllMissedDeadlineEvents();
    const recentActivity = await storage.getActivityLogs(10);

    const today = storage.getTodayDateString(settings.timezone);

    // Calculate upcoming deadlines (next 7 days)
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const maxDate = sevenDaysLater.toISOString().split('T')[0];

    const upcomingTasks = tasks
      .filter((t) => t.status !== 'Completed' && t.currentTargetDate >= today && t.currentTargetDate <= maxDate)
      .sort((a, b) => a.currentTargetDate.localeCompare(b.currentTargetDate));

    // Missed targets by team member
    const missedByMember: Record<string, { memberName: string; missedCount: number; activeTaskCount: number }> = {};
    members.forEach((m) => {
      missedByMember[m.id] = { memberName: m.fullName, missedCount: 0, activeTaskCount: 0 };
    });

    tasks.forEach((t) => {
      t.assigneeIds.forEach((mId) => {
        if (missedByMember[mId]) {
          missedByMember[mId].missedCount += t.missedDeadlineCount || 0;
          if (t.status !== 'Completed') {
            missedByMember[mId].activeTaskCount += 1;
          }
        }
      });
    });

    // Priority breakdown
    const priorityBreakdown = {
      Critical: tasks.filter((t) => t.priority === 'Critical').length,
      High: tasks.filter((t) => t.priority === 'High').length,
      Medium: tasks.filter((t) => t.priority === 'Medium').length,
      Low: tasks.filter((t) => t.priority === 'Low').length,
    };

    // Status breakdown
    const statusBreakdown = {
      'To Do': tasks.filter((t) => t.status === 'To Do').length,
      'In Progress': tasks.filter((t) => t.status === 'In Progress').length,
      'On Hold': tasks.filter((t) => t.status === 'On Hold').length,
      Completed: tasks.filter((t) => t.status === 'Completed').length,
    };

    res.json({
      metrics,
      today,
      timezone: settings.timezone,
      statusBreakdown,
      priorityBreakdown,
      upcomingTasks,
      missedByMember: Object.values(missedByMember),
      recentActivity,
      goalsSummary: {
        total: goals.length,
        achieved: goals.filter((g) => g.status === 'Achieved' || g.progress >= 100).length,
        inProgress: goals.filter((g) => g.status === 'In Progress').length,
        overdue: goals.filter((g) => g.status === 'Overdue').length,
      },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/dashboard/trends', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await storage.getAllTasks();
    const missedDeadlines = await storage.getAllMissedDeadlineEvents();

    // Group completions by week/month
    const completedTasks = tasks.filter((t) => t.status === 'Completed' && t.completedAt);
    const completionTrends: Record<string, number> = {};

    completedTasks.forEach((t) => {
      const dateKey = t.completedAt!.split('T')[0];
      completionTrends[dateKey] = (completionTrends[dateKey] || 0) + 1;
    });

    res.json({
      completionTrends,
      totalCompleted: completedTasks.length,
      totalMissedHistorical: missedDeadlines.length,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. TEAM MEMBERS
// ==========================================
apiRouter.get('/team-members', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await storage.getAllTeamMembers();
    const tasks = await storage.getAllTasks();
    const goals = await storage.getAllGoals();
    const settings = await storage.getSettings();
    const today = storage.getTodayDateString(settings.timezone);

    // Enrich with aggregated stats per member
    const enriched = members.map((member) => {
      const assignedTasks = tasks.filter((t) => t.assigneeIds.includes(member.id));
      const completed = assignedTasks.filter((t) => t.status === 'Completed').length;
      const inProgress = assignedTasks.filter((t) => t.status === 'In Progress').length;
      const onHold = assignedTasks.filter((t) => t.status === 'On Hold').length;
      const toDo = assignedTasks.filter((t) => t.status === 'To Do').length;
      const overdue = assignedTasks.filter((t) => t.status !== 'Completed' && t.currentTargetDate < today).length;
      const missedCount = assignedTasks.reduce((sum, t) => sum + (t.missedDeadlineCount || 0), 0);
      const completionRate = assignedTasks.length > 0 ? Math.round((completed / assignedTasks.length) * 100) : 0;
      const assignedGoals = goals.filter((g) => g.ownerIds.includes(member.id));

      return {
        ...member,
        stats: {
          totalAssigned: assignedTasks.length,
          completed,
          inProgress,
          onHold,
          toDo,
          overdue,
          missedCount,
          completionRate,
          goalsCount: assignedGoals.length,
        },
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/team-members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, employeeCode, email, phone, designation, department, joiningDate, notes, avatarUrl } = req.body;
    if (!fullName || !fullName.trim()) {
      res.status(400).json({ error: 'Full name is required.' });
      return;
    }
    if (!employeeCode || !employeeCode.trim()) {
      res.status(400).json({ error: 'Employee code is required.' });
      return;
    }
    if (!email || !email.trim()) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const newMember = await storage.createTeamMember({
      fullName: fullName.trim(),
      employeeCode: employeeCode.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      designation: designation?.trim() || 'Team Member',
      department: department?.trim() || 'General',
      joiningDate: joiningDate || storage.getTodayDateString(),
      status: 'Active',
      avatarUrl: avatarUrl || undefined,
      notes: notes?.trim() || '',
    });

    res.status(201).json(newMember);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/team-members/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await storage.getTeamMemberById(req.params.id);
    if (!member) {
      res.status(404).json({ error: 'Team member not found.' });
      return;
    }
    res.json(member);
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/team-members/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await storage.updateTeamMember(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/team-members/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (status !== 'Active' && status !== 'Inactive') {
      res.status(400).json({ error: "Status must be 'Active' or 'Inactive'." });
      return;
    }
    const updated = await storage.setTeamMemberStatus(req.params.id, status);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/team-members/:id/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await storage.getAllTasks();
    const memberTasks = tasks.filter((t) => t.assigneeIds.includes(req.params.id));
    res.json(memberTasks);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/team-members/:id/goals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await storage.getAllGoals();
    const memberGoals = goals.filter((g) => g.ownerIds.includes(req.params.id));
    res.json(memberGoals);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. TASKS
// ==========================================
apiRouter.get('/tasks', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await storage.getAllTasks();
    const settings = await storage.getSettings();
    const today = storage.getTodayDateString(settings.timezone);

    // Compute dynamic properties like daysOverdue
    const enrichedTasks = tasks.map((task) => {
      let isOverdue = false;
      let daysOverdue = 0;

      if (task.status !== 'Completed' && task.currentTargetDate < today) {
        isOverdue = true;
        const diffMs = new Date(today).getTime() - new Date(task.currentTargetDate).getTime();
        daysOverdue = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        ...task,
        isOverdue,
        daysOverdue,
      };
    });

    res.json(enrichedTasks);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      assigneeIds,
      department,
      project,
      category,
      priority,
      status,
      startDate,
      targetDate,
      reminderDate,
      estimatedEffortHours,
      progress,
      linkedGoalIds,
      adminRemarks,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Task title is required.' });
      return;
    }
    if (!targetDate || !targetDate.trim()) {
      res.status(400).json({ error: 'Target deadline date is required.' });
      return;
    }

    const newTask = await storage.createTask({
      title,
      description,
      assigneeIds: Array.isArray(assigneeIds) ? assigneeIds : [],
      department,
      project,
      category,
      priority,
      status,
      startDate,
      targetDate,
      reminderDate,
      estimatedEffortHours: estimatedEffortHours ? Number(estimatedEffortHours) : 0,
      progress: progress !== undefined ? Number(progress) : 0,
      linkedGoalIds: Array.isArray(linkedGoalIds) ? linkedGoalIds : [],
      adminRemarks,
    });

    res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await storage.getTaskById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const settings = await storage.getSettings();
    const today = storage.getTodayDateString(settings.timezone);
    const isOverdue = task.status !== 'Completed' && task.currentTargetDate < today;
    let daysOverdue = 0;
    if (isOverdue) {
      const diffMs = new Date(today).getTime() - new Date(task.currentTargetDate).getTime();
      daysOverdue = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    const history = await storage.getDeadlineHistoryForTask(task.id);
    const missedEvents = await storage.getMissedDeadlinesForTask(task.id);
    const comments = await storage.getCommentsForTask(task.id);

    res.json({
      ...task,
      isOverdue,
      daysOverdue,
      deadlineHistory: history,
      missedDeadlines: missedEvents,
      comments,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await storage.updateTask(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/tasks/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['To Do', 'In Progress', 'On Hold', 'Completed'].includes(status)) {
      res.status(400).json({ error: 'Invalid task status.' });
      return;
    }
    const updated = await storage.updateTask(req.params.id, { status });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/tasks/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = Number(req.body.progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      res.status(400).json({ error: 'Progress must be a number between 0 and 100.' });
      return;
    }

    const updates: any = { progress };
    if (progress === 100) {
      updates.status = 'Completed';
    }
    const updated = await storage.updateTask(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/tasks/:id/reschedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newTargetDate, reason, adminRemarks } = req.body;
    if (!newTargetDate || !newTargetDate.trim()) {
      res.status(400).json({ error: 'New target date is required.' });
      return;
    }
    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'Mandatory reason for rescheduling must be provided.' });
      return;
    }

    const result = await storage.rescheduleTask({
      taskId: req.params.id,
      newTargetDate: newTargetDate.trim(),
      reason: reason.trim(),
      adminRemarks: adminRemarks?.trim() || '',
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/tasks/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, authorName, authorRole } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Comment content cannot be empty.' });
      return;
    }
    const comment = await storage.addComment({
      taskId: req.params.id,
      content,
      authorName,
      authorRole,
    });
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/tasks/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comments = await storage.getCommentsForTask(req.params.id);
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/tasks/:id/deadline-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await storage.getDeadlineHistoryForTask(req.params.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = await storage.deleteTask(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. GOALS
// ==========================================
apiRouter.get('/goals', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await storage.getAllGoals();
    const tasks = await storage.getAllTasks();

    const enriched = goals.map((goal) => {
      const linkedTasks = tasks.filter((t) => goal.linkedTaskIds.includes(t.id));
      const completedLinked = linkedTasks.filter((t) => t.status === 'Completed').length;
      return {
        ...goal,
        linkedTasksSummary: {
          total: linkedTasks.length,
          completed: completedLinked,
        },
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/goals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      ownerIds,
      department,
      project,
      category,
      startDate,
      targetDate,
      targetValue,
      currentAchievementValue,
      unitOfMeasurement,
      status,
      linkedTaskIds,
      notes,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Goal title is required.' });
      return;
    }
    if (!targetDate || !targetDate.trim()) {
      res.status(400).json({ error: 'Target date is required.' });
      return;
    }

    const newGoal = await storage.createGoal({
      title: title.trim(),
      description: description?.trim() || '',
      ownerIds: Array.isArray(ownerIds) ? ownerIds : [],
      department: department?.trim() || 'General',
      project: project?.trim() || 'General',
      category: category || 'Team',
      startDate: startDate || storage.getTodayDateString(),
      targetDate: targetDate.trim(),
      targetValue: Number(targetValue) || 1,
      currentAchievementValue: Number(currentAchievementValue) || 0,
      unitOfMeasurement: unitOfMeasurement?.trim() || 'units',
      progress: 0,
      status: status || 'In Progress',
      linkedTaskIds: Array.isArray(linkedTaskIds) ? linkedTaskIds : [],
      notes: notes?.trim() || '',
    });

    res.status(201).json(newGoal);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/goals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const goal = await storage.getGoalById(req.params.id);
    if (!goal) {
      res.status(404).json({ error: 'Goal not found.' });
      return;
    }
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/goals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await storage.updateGoal(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/goals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = await storage.deleteGoal(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Goal not found.' });
      return;
    }
    res.json({ success: true, message: 'Goal deleted.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. NOTIFICATIONS
// ==========================================
apiRouter.get('/notifications', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const notifs = await storage.getAllNotifications();
    res.json(notifs);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/notifications/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = await storage.markNotificationRead(req.params.id);
    res.json({ success });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/notifications/read-all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedCount = await storage.markAllNotificationsRead();
    res.json({ success: true, updatedCount });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. ACTIVITY LOGS
// ==========================================
apiRouter.get('/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = await storage.getActivityLogs(limit);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 8. REPORTS & CSV EXPORT
// ==========================================
apiRouter.get('/reports/team-performance', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await storage.getAllTeamMembers();
    const tasks = await storage.getAllTasks();
    const missedEvents = await storage.getAllMissedDeadlineEvents();
    const settings = await storage.getSettings();
    const today = storage.getTodayDateString(settings.timezone);

    const report = members.map((member) => {
      const assigned = tasks.filter((t) => t.assigneeIds.includes(member.id));
      const completed = assigned.filter((t) => t.status === 'Completed').length;
      const overdue = assigned.filter((t) => t.status !== 'Completed' && t.currentTargetDate < today).length;
      const inProgress = assigned.filter((t) => t.status === 'In Progress').length;
      const missedCount = assigned.reduce((acc, t) => acc + (t.missedDeadlineCount || 0), 0);
      const completionRate = assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0;

      return {
        memberId: member.id,
        name: member.fullName,
        code: member.employeeCode,
        department: member.department,
        designation: member.designation,
        totalTasks: assigned.length,
        completed,
        inProgress,
        overdue,
        missedDeadlines: missedCount,
        completionRate,
      };
    });

    res.json({
      reportDate: today,
      membersCount: members.length,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/reports/overdue', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await storage.getAllTasks();
    const members = await storage.getAllTeamMembers();
    const memberMap = new Map(members.map((m) => [m.id, m.fullName]));
    const settings = await storage.getSettings();
    const today = storage.getTodayDateString(settings.timezone);

    const overdueTasks = tasks
      .filter((t) => t.status !== 'Completed' && t.currentTargetDate < today)
      .map((t) => {
        const diffMs = new Date(today).getTime() - new Date(t.currentTargetDate).getTime();
        const daysOverdue = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        return {
          id: t.id,
          title: t.title,
          assignees: t.assigneeIds.map((id) => memberMap.get(id) || id).join(', '),
          project: t.project,
          priority: t.priority,
          originalTargetDate: t.originalTargetDate,
          currentTargetDate: t.currentTargetDate,
          daysOverdue,
          missedDeadlineCount: t.missedDeadlineCount,
          deadlineRevisionCount: t.deadlineRevisionCount,
          progress: t.progress,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json(overdueTasks);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/reports/missed-deadlines', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await storage.getAllMissedDeadlineEvents();
    const tasks = await storage.getAllTasks();
    const members = await storage.getAllTeamMembers();
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const memberMap = new Map(members.map((m) => [m.id, m.fullName]));

    const report = events.map((event) => {
      const task = taskMap.get(event.taskId);
      return {
        id: event.id,
        taskId: event.taskId,
        taskTitle: task?.title || 'Unknown Task',
        assignees: task ? task.assigneeIds.map((id) => memberMap.get(id) || id).join(', ') : '',
        targetDateMissed: event.targetDateMissed,
        detectedAt: event.detectedAt,
        currentTaskStatus: task?.status || 'Unknown',
        currentTaskTargetDate: task?.currentTargetDate || '',
      };
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/reports/export.csv', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = (req.query.type as string) || 'tasks';
    const tasks = await storage.getAllTasks();
    const members = await storage.getAllTeamMembers();
    const memberMap = new Map(members.map((m) => [m.id, m.fullName]));

    let csvContent = '';
    let filename = `teamtrack-${type}-${Date.now()}.csv`;

    if (type === 'performance') {
      csvContent = 'Member Code,Full Name,Department,Designation,Total Tasks,Completed,In Progress,Overdue,Missed Targets,Completion Rate (%)\n';
      const settings = await storage.getSettings();
      const today = storage.getTodayDateString(settings.timezone);

      members.forEach((m) => {
        const assigned = tasks.filter((t) => t.assigneeIds.includes(m.id));
        const completed = assigned.filter((t) => t.status === 'Completed').length;
        const overdue = assigned.filter((t) => t.status !== 'Completed' && t.currentTargetDate < today).length;
        const inProgress = assigned.filter((t) => t.status === 'In Progress').length;
        const missed = assigned.reduce((acc, t) => acc + (t.missedDeadlineCount || 0), 0);
        const rate = assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0;

        csvContent += `"${m.employeeCode}","${m.fullName}","${m.department}","${m.designation}",${assigned.length},${completed},${inProgress},${overdue},${missed},${rate}%\n`;
      });
    } else {
      // Default tasks CSV
      csvContent = 'Task ID,Title,Project,Priority,Status,Progress,Original Target Date,Current Target Date,Missed Deadlines,Deadline Revisions,Assignees\n';
      tasks.forEach((t) => {
        const assignees = t.assigneeIds.map((id) => memberMap.get(id) || id).join('; ');
        csvContent += `"${t.id}","${t.title.replace(/"/g, '""')}","${t.project}","${t.priority}","${t.status}",${t.progress}%,"${t.originalTargetDate}","${t.currentTargetDate}",${t.missedDeadlineCount},${t.deadlineRevisionCount},"${assignees}"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 9. BACKUP & RESTORE
// ==========================================
apiRouter.get('/backup/export', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const backup = await storage.exportBackup();
    res.setHeader('Content-Disposition', `attachment; filename="teamtrack-backup-${Date.now()}.json"`);
    res.json(backup);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/backup/validate', async (req: Request, res: Response) => {
  const result = storage.validateBackup(req.body);
  res.json(result);
});

apiRouter.post('/backup/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await storage.restoreBackup(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 10. SETTINGS & SAMPLE DATA
// ==========================================
apiRouter.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await storage.getSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await storage.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/sample-data/load', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await loadSampleData();
    res.json({
      success: true,
      message: 'Sample demonstration data successfully loaded.',
      result,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/sample-data/clear', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await storage.clearAllData();
    res.json({
      success: true,
      message: 'All application records successfully cleared.',
    });
  } catch (err) {
    next(err);
  }
});
