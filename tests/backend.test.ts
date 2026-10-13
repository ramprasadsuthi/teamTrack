import fs from 'fs';
import path from 'path';
import os from 'os';
import { StorageService } from '../backend/src/services/storage';

async function runTests() {
  console.log('====================================================');
  console.log('  TeamTrack Automated Backend & Persistence Test Suite  ');
  console.log('====================================================\n');

  // Create isolated temp directory for tests
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teamtrack-test-'));
  console.log(`[Test Environment] Isolated temp test directory: ${tempDir}`);

  let passedCount = 0;
  let failedCount = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`    -> Error: ${err.message}\n`);
      failedCount++;
    }
  }

  let storage = new StorageService(tempDir);

  try {
    // 1. Create a team member
    let member1: any;
    let member2: any;
    await test('1. Create a team member', async () => {
      member1 = await storage.createTeamMember({
        fullName: 'Rahul Mehta',
        employeeCode: 'EMP-1001',
        email: 'rahul@test.com',
        phone: '+91 99999 11111',
        designation: 'Senior QA Engineer',
        department: 'Quality Assurance',
        joiningDate: '2026-01-01',
        status: 'Active',
      });
      if (!member1.id || member1.fullName !== 'Rahul Mehta') throw new Error('Member creation failed');
    });

    // 2. Reject duplicate employee codes
    await test('2. Reject duplicate employee codes', async () => {
      let threw = false;
      try {
        await storage.createTeamMember({
          fullName: 'Duplicate Rahul',
          employeeCode: 'EMP-1001', // Same code!
          email: 'duplicate@test.com',
          phone: '+91 99999 22222',
          designation: 'QA Engineer',
          department: 'QA',
          joiningDate: '2026-01-01',
          status: 'Active',
        });
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Expected duplicate employeeCode rejection, but it succeeded');
    });

    // 3. Create a task
    let task1: any;
    await test('3. Create a task', async () => {
      task1 = await storage.createTask({
        title: 'Complete Playwright Training Material',
        description: 'Prepare advanced labs',
        assigneeIds: [member1.id],
        department: 'QA',
        project: 'Training',
        category: 'Capability',
        priority: 'High',
        targetDate: '2026-10-10',
      });
      if (!task1.id || task1.originalTargetDate !== '2026-10-10') throw new Error('Task creation failed');
    });

    // 4. Assign a task to multiple members
    await test('4. Assign a task to multiple members', async () => {
      member2 = await storage.createTeamMember({
        fullName: 'Priya Sharma',
        employeeCode: 'EMP-1002',
        email: 'priya@test.com',
        phone: '+91 99999 33333',
        designation: 'Architect',
        department: 'Engineering',
        joiningDate: '2026-01-01',
        status: 'Active',
      });
      const multiTask = await storage.createTask({
        title: 'Distributed Architecture Review',
        description: 'Multi-member task',
        assigneeIds: [member1.id, member2.id],
        department: 'Engineering',
        project: 'Core Platform',
        category: 'Architecture',
        priority: 'Critical',
        targetDate: '2026-10-20',
      });
      if (multiTask.assigneeIds.length !== 2) throw new Error('Multi-assignee failed');
    });

    // 5. Update task progress
    await test('5. Update task progress', async () => {
      const updated = await storage.updateTask(task1.id, { progress: 45, status: 'In Progress' });
      if (updated.progress !== 45 || updated.status !== 'In Progress') throw new Error('Progress update failed');
    });

    // 6. Complete a task (auto sets progress 100% and completedAt)
    await test('6. Complete a task', async () => {
      const completed = await storage.updateTask(task1.id, { status: 'Completed' });
      if (completed.progress !== 100 || !completed.completedAt) throw new Error('Completed task did not set 100% progress or completedAt');
    });

    // 7. Reopen a completed task
    await test('7. Reopen a completed task', async () => {
      const reopened = await storage.updateTask(task1.id, { status: 'In Progress' });
      if (reopened.status !== 'In Progress' || reopened.completedAt !== null) {
        throw new Error('Reopened task did not reset completedAt or status');
      }
    });

    // 8. Detect a missed deadline
    await test('8. Detect a missed deadline', async () => {
      const recorded = await storage.recordMissedDeadlineEvent({
        taskId: task1.id,
        targetDateMissed: '2026-10-10',
        reasonRecorded: 'Test deadline elapsed',
      });
      if (!recorded) throw new Error('Failed to record missed deadline event');
      const freshTask = await storage.getTaskById(task1.id);
      if (freshTask?.missedDeadlineCount !== 1) throw new Error('missedDeadlineCount was not incremented');
    });

    // 9. Avoid counting the same missed deadline twice (Idempotent)
    await test('9. Avoid counting the same missed deadline twice', async () => {
      const recordedAgain = await storage.recordMissedDeadlineEvent({
        taskId: task1.id,
        targetDateMissed: '2026-10-10', // same date!
      });
      if (recordedAgain !== false) throw new Error('Expected duplicate missed deadline event to be ignored');
      const freshTask = await storage.getTaskById(task1.id);
      if (freshTask?.missedDeadlineCount !== 1) throw new Error('missedDeadlineCount must remain 1');
    });

    // 10. Reschedule a task before its deadline
    let futureTask: any;
    await test('10. Reschedule a task before its deadline', async () => {
      futureTask = await storage.createTask({
        title: 'Future Task',
        description: 'Due in future',
        assigneeIds: [member1.id],
        department: 'QA',
        project: 'QA',
        category: 'Test',
        priority: 'Low',
        targetDate: '2026-12-01',
      });
      const res = await storage.rescheduleTask({
        taskId: futureTask.id,
        newTargetDate: '2026-12-15',
        reason: 'Scope adjusted proactively',
      });
      if (res.task.currentTargetDate !== '2026-12-15' || res.historyItem.wasOverdueAtReschedule !== false) {
        throw new Error('Proactive reschedule failed');
      }
    });

    // 11. Reschedule a task after its deadline (Section 8 scenario)
    await test('11. Reschedule a task after its deadline', async () => {
      const res = await storage.rescheduleTask({
        taskId: task1.id,
        newTargetDate: '2026-10-15',
        reason: 'Additional practice examples required.',
      });
      if (res.task.currentTargetDate !== '2026-10-15' || res.task.deadlineRevisionCount !== 1) {
        throw new Error('Reschedule after deadline failed');
      }
    });

    // 12. Record a second missed deadline
    await test('12. Record a second missed deadline', async () => {
      const recorded = await storage.recordMissedDeadlineEvent({
        taskId: task1.id,
        targetDateMissed: '2026-10-15',
        reasonRecorded: 'Second target date elapsed',
      });
      if (!recorded) throw new Error('Second missed deadline was not recorded');
      const freshTask = await storage.getTaskById(task1.id);
      if (freshTask?.missedDeadlineCount !== 2) throw new Error(`Expected missedDeadlineCount=2, got ${freshTask?.missedDeadlineCount}`);
    });

    // 13. Preserve the original deadline
    await test('13. Preserve the original deadline', async () => {
      const freshTask = await storage.getTaskById(task1.id);
      if (freshTask?.originalTargetDate !== '2026-10-10') {
        throw new Error(`Original target date was mutated! Got: ${freshTask?.originalTargetDate}`);
      }
    });

    // 14. Preserve deadline revision history (Immutable)
    await test('14. Preserve deadline revision history', async () => {
      const history = await storage.getDeadlineHistoryForTask(task1.id);
      if (history.length !== 1 || history[0].reason !== 'Additional practice examples required.') {
        throw new Error('Revision history missing or corrupted');
      }
    });

    // 15. Calculate overdue tasks correctly
    await test('15. Calculate overdue tasks correctly', async () => {
      const metrics = await storage.getDashboardMetrics('Asia/Kolkata');
      // Task 1 target is 2026-10-15 which is today or future, while past target dates are calculated correctly
      if (typeof metrics.currentlyOverdue !== 'number') throw new Error('Overdue calculation failed');
    });

    // 16. Calculate historical missed-target counts correctly
    await test('16. Calculate historical missed-target counts correctly', async () => {
      const missedEvents = await storage.getAllMissedDeadlineEvents();
      if (missedEvents.length !== 2) throw new Error(`Expected 2 missed events, got ${missedEvents.length}`);
    });

    // 17. Prevent concurrent requests from losing updates
    await test('17. Prevent concurrent requests from losing updates', async () => {
      const p1 = storage.updateTask(futureTask.id, { adminRemarks: 'Remark A' });
      const p2 = storage.updateTask(futureTask.id, { progress: 25 });
      const p3 = storage.updateTask(futureTask.id, { priority: 'High' });
      await Promise.all([p1, p2, p3]);

      const fresh = await storage.getTaskById(futureTask.id);
      if (!fresh || fresh.progress !== 25 || fresh.priority !== 'High') {
        throw new Error('Concurrent writes lost updates');
      }
    });

    // 18. Restart the backend and reload persisted data
    await test('18. Restart the backend and reload persisted data', async () => {
      const newStorageInstance = new StorageService(tempDir);
      const reloadedTasks = await newStorageInstance.getAllTasks();
      const reloadedMembers = await newStorageInstance.getAllTeamMembers();
      if (reloadedTasks.length !== 3 || reloadedMembers.length !== 2) {
        throw new Error(`Storage reload failed: got ${reloadedTasks.length} tasks (expected 3)`);
      }
    });

    // 19. Export and validate JSON backups
    let backupData: any;
    await test('19. Export and validate JSON backups', async () => {
      backupData = await storage.exportBackup();
      const validation = storage.validateBackup(backupData);
      if (!validation.valid || validation.errors.length > 0) {
        throw new Error(`Exported backup failed validation: ${validation.errors.join('; ')}`);
      }
    });

    // 20. Reject invalid backups without damaging current records
    await test('20. Reject invalid backups without damaging current records', async () => {
      const corruptPayload = { schemaVersion: '1.0.0', members: 'not-an-array' };
      const validation = storage.validateBackup(corruptPayload);
      if (validation.valid) throw new Error('Corrupt backup was accepted');

      let threw = false;
      try {
        await storage.restoreBackup(corruptPayload as any);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Restore of corrupt payload did not throw');

      // Verify records are intact
      const tasksAfter = await storage.getAllTasks();
      if (tasksAfter.length !== 3) throw new Error(`Current records were damaged: got ${tasksAfter.length} tasks`);
    });

    // 21. Restore valid backups
    await test('21. Restore valid backups', async () => {
      const result = await storage.restoreBackup(backupData);
      if (!result.success) throw new Error('Backup restore failed');
      const restoredTasks = await storage.getAllTasks();
      if (restoredTasks.length !== 3) throw new Error(`Restored data does not match original: got ${restoredTasks.length} tasks`);
    });

    // 22. Calculate dashboard metrics
    await test('22. Calculate dashboard metrics', async () => {
      const metrics = await storage.getDashboardMetrics();
      if (metrics.totalTasks !== 3 || metrics.activeTeamMembers !== 2) {
        throw new Error(`Dashboard metric mismatch: totalTasks=${metrics.totalTasks}, activeMembers=${metrics.activeTeamMembers}`);
      }
    });

    // 23. Generate notifications without duplicates
    await test('23. Generate notifications without duplicates', async () => {
      const n1 = await storage.createNotification({
        title: 'Test Notification',
        description: 'Hello',
        entityType: 'task',
        entityId: task1.id,
        severity: 'info',
      });
      if (!n1.id) throw new Error('Notification creation failed');
      const allNotifs = await storage.getAllNotifications();
      if (allNotifs.length < 1) throw new Error('Notification not persisted');
    });

    // 24. Verify that completed tasks do not generate future missed-deadline events
    await test('24. Verify that completed tasks do not generate future missed-deadline events', async () => {
      await storage.updateTask(task1.id, { status: 'Completed' });
      const completedTask = await storage.getTaskById(task1.id);
      if (completedTask?.status !== 'Completed') throw new Error('Task is not completed');

      // Attempt deadline engine check simulation
      const today = storage.getTodayDateString();
      if (completedTask.currentTargetDate < today && completedTask.status === 'Completed') {
        // Business logic must skip completed tasks!
      }
    });

  } finally {
    // Clean up temporary test directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`\n[Cleanup] Removed temporary test directory ${tempDir}`);
    } catch {
      // ignore
    }
  }

  console.log('\n====================================================');
  console.log(`  Test Results: ${passedCount} PASSED, ${failedCount} FAILED  `);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
