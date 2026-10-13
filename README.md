# TeamTrack — Staff Task & Goal Tracker

TeamTrack is a production-grade, internal staff task and goal management web application designed for administrators to coordinate teams, assign work items, define measurable targets, monitor deadlines, detect missed targets automatically, and audit deadline revisions with an immutable history log.

---

## 🌟 Key Features

1. **Persistent Server-Side JSON Storage**: No external SQL/NoSQL database dependency. All business records (members, tasks, goals, revisions, missed deadlines, comments, notifications, activity logs) are stored directly on the Node.js server filesystem with atomic temp-write-and-rename mechanics and write serialization.
2. **Automated Missed Deadline Engine**: Detects incomplete tasks whose current target date has elapsed past the server's business date (in configured timezone, default `Asia/Kolkata`). Deduplicates events so each missed deadline is recorded exactly once per target date.
3. **Formal Rescheduling Workflow**:
   - Preserves original target date permanently.
   - Requires mandatory rescheduling reason and optional admin remarks.
   - Increments revision count and logs immutable change history with previous and new target dates.
4. **Measurable Goals & Targets**: Supports Individual, Team, Project, and Quarterly goals with quantifiable target values (e.g. 10 scripts, 20 defects resolved), real-time progress calculations, and linked task tracking.
5. **Multi-View Task Management**:
   - Table view with 11 columns (Title, Assignee, Project, Priority, Status, Orig. Target, Current Target, Days Overdue, Missed Targets, Progress, Actions).
   - Kanban view across 4 lifecycle stages: *To Do*, *In Progress*, *On Hold*, and *Completed*.
6. **Executive Dashboard**: 10 distinct KPI metrics, status doughnut chart, priority workload distribution, member performance comparison, 7-day upcoming deadline tracker, and recent activity trail.
7. **Action Center for Overdue Tasks**: Immediate visibility of all active items past their target date with single-click rescheduling.
8. **Monthly Target Calendar**: Visual scheduling matrix highlighting deliverables, target dates, completed items, and overdue markers.
9. **Staff Directory & Workload**: CRUD for staff members, duplicate employee code/email protection, status toggle (Active/Inactive) with historical data preservation.
10. **Reports & CSV Exports**: Performance audit tables, missed deadline logs, and one-click CSV export.
11. **JSON Backup & Safe Restore**: Full JSON snapshot export with pre-validation and automatic safety pre-restore backup.
12. **Sample Demonstration Dataset**: One-click seeding of 5 realistic team members, 15 tasks across all statuses (including multi-revised tasks), and 4 goals.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Lucide Icons, Recharts.
- **Backend**: Node.js LTS, Express 4.x, TypeScript, RESTful API (`/api/v1/*`), atomic file persistence.
- **Storage**: Server-side JSON files located in configurable directory (`DATA_DIR`).

### Data Directory Schema
Inside `$DATA_DIR` (defaults to `./data`):
- `team-members.json`: Staff profiles and status.
- `tasks.json`: Work items and execution state.
- `goals.json`: Strategic and team goals.
- `deadline-history.json`: Immutable audit log of deadline revisions.
- `missed-deadlines.json`: Deduplicated missed deadline events.
- `comments.json`: Task progress comments.
- `activity-logs.json`: Global activity audit trail.
- `notifications.json`: In-app alert notifications.
- `settings.json`: Tenant configuration and timezone rules.
- `backups/`: Automated pre-restore snapshots and backups.

---

## 🚀 Installation & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Access the application at `http://localhost:3000`. Vite proxies backend API calls seamlessly via integrated Express middleware.

### 3. Build & Production Start
```bash
npm run build
npm start
```
Starts the standalone Express server serving static frontend assets from `dist/` on port `3000` (or `PORT` environment variable).

---

## 🧪 Automated Testing

Run the comprehensive test suite covering all 24 acceptance criteria against an isolated temporary directory:
```bash
npm test
```

### Verified Test Cases:
1. Create a team member.
2. Reject duplicate employee codes.
3. Create a task.
4. Assign a task to multiple members.
5. Update task progress.
6. Complete a task (auto sets 100% progress and `completedAt`).
7. Reopen a completed task.
8. Detect a missed deadline.
9. Avoid counting the same missed deadline twice (idempotence).
10. Reschedule a task before its deadline.
11. Reschedule a task after its deadline.
12. Record a second missed deadline.
13. Preserve the original deadline.
14. Preserve deadline revision history.
15. Calculate overdue tasks correctly.
16. Calculate historical missed-target counts correctly.
17. Prevent concurrent requests from losing updates.
18. Restart the backend and reload persisted data.
19. Export and validate JSON backups.
20. Reject invalid backups without damaging current records.
21. Restore valid backups.
22. Calculate dashboard metrics.
23. Generate notifications without duplicates.
24. Verify that completed tasks do not generate future missed-deadline events.

---

## 🚢 Deployment (e.g. AWS EC2 or Persistent Node.js Host)

### Environment Variables
Configure the following in your deployment environment or `.env`:
```env
PORT=3000
NODE_ENV=production
DATA_DIR=/var/data/teamtrack
APP_TIMEZONE=Asia/Kolkata
```

### Deployment Steps on AWS EC2
1. **Provision an EC2 Instance** (e.g., Ubuntu 22.04 / 24.04 LTS).
2. **Attach Persistent Storage**: Ensure you are using an EBS volume or dedicated mount point so files survive instance restarts.
3. **Mount Persistent Directory**:
   ```bash
   sudo mkdir -p /var/data/teamtrack
   sudo chown -R $USER:$USER /var/data/teamtrack
   ```
4. **Deploy Application**:
   ```bash
   git clone <repository_url>
   cd teamtrack
   npm install
   npm run build
   ```
5. **Run with Process Manager (PM2 or Systemd)**:
   ```bash
   export DATA_DIR=/var/data/teamtrack
   pm2 start "npm start" --name teamtrack
   pm2 save
   ```
6. **Graceful Shutdown**: The server handles `SIGTERM` and `SIGINT`, cleanly terminating background interval jobs before exit.

---

## ⚠️ Important Limitations

- **JSON File Storage**: Designed for small-to-medium teams with internal administrator concurrency. While file writes are atomic and serialized, high concurrent write loads (e.g., hundreds of simultaneous writes per second) are better suited for relational databases like PostgreSQL.
- **Ephemeral Filesystems**: On platforms with ephemeral filesystems (such as standard Heroku or non-persistent container restarts), data will reset on container rebuild unless a persistent volume (e.g. AWS EBS, GCP persistent disk) is mounted to `DATA_DIR`.
- **Backups**: Always take regular JSON backups via the Settings page (`/settings`) or automate file backups of the `DATA_DIR` folder.
