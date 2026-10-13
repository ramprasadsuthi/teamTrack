import { storage } from './storage';

export class DeadlineEngine {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor() {}

  /**
   * Run the deadline checks immediately.
   * Safe to call repeatedly without creating duplicate missed deadline events.
   */
  public async checkDeadlines(): Promise<{
    processedTasks: number;
    newMissedCount: number;
    upcomingRemindersCount: number;
  }> {
    if (this.isProcessing) {
      return { processedTasks: 0, newMissedCount: 0, upcomingRemindersCount: 0 };
    }

    this.isProcessing = true;
    try {
      const settings = await storage.getSettings();
      const today = storage.getTodayDateString(settings.timezone);
      const tasks = await storage.getAllTasks();

      let newMissedCount = 0;
      let upcomingRemindersCount = 0;

      for (const task of tasks) {
        // Business Rule: Completed tasks must NOT generate missed deadlines
        if (task.status === 'Completed') {
          continue;
        }

        // Rule 7 & 8: Overdue when current target date is strictly before today
        if (task.currentTargetDate < today) {
          const recorded = await storage.recordMissedDeadlineEvent({
            taskId: task.id,
            targetDateMissed: task.currentTargetDate,
            reasonRecorded: 'Automated deadline monitor detected target date elapsed without completion',
          });
          if (recorded) {
            newMissedCount++;
          }
        } else if (task.currentTargetDate === today) {
          // Task due today notification - check if already sent today
          const notifs = await storage.getAllNotifications();
          const alreadyNotified = notifs.some(
            (n) =>
              n.entityId === task.id &&
              n.title.includes('Due Today') &&
              n.createdAt.startsWith(today)
          );
          if (!alreadyNotified) {
            await storage.createNotification({
              title: `Task Due Today: ${task.title}`,
              description: `Task "${task.title}" is due today (${today}).`,
              entityType: 'task',
              entityId: task.id,
              severity: 'warning',
            });
            upcomingRemindersCount++;
          }
        }
      }

      // Check Goals deadlines
      const goals = await storage.getAllGoals();
      for (const goal of goals) {
        if (goal.status === 'Achieved' || goal.status === 'Archived') {
          continue;
        }
        if (goal.targetDate < today && goal.status !== 'Overdue') {
          await storage.updateGoal(goal.id, { status: 'Overdue' });
          await storage.createNotification({
            title: `Goal Overdue: ${goal.title}`,
            description: `Target date ${goal.targetDate} has elapsed for goal "${goal.title}".`,
            entityType: 'goal',
            entityId: goal.id,
            severity: 'danger',
          });
        }
      }

      return {
        processedTasks: tasks.length,
        newMissedCount,
        upcomingRemindersCount,
      };
    } catch (err) {
      console.error('[DeadlineEngine] Error executing deadline checks:', err);
      return { processedTasks: 0, newMissedCount: 0, upcomingRemindersCount: 0 };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Starts periodic background checking
   */
  public start(intervalMinutes = 5): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    // Run initial check immediately
    this.checkDeadlines().catch((err) => {
      console.error('[DeadlineEngine] Initial check failed:', err);
    });

    const ms = Math.max(1, intervalMinutes) * 60 * 1000;
    this.timer = setInterval(() => {
      this.checkDeadlines().catch((err) => {
        console.error('[DeadlineEngine] Periodic check failed:', err);
      });
    }, ms);
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const deadlineEngine = new DeadlineEngine();
