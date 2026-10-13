import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Users,
  Target,
  Plus,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api, DashboardMetrics, Task, ActivityLog } from '../services/api';
import { useApp } from '../context/AppContext';
import { TaskModal } from '../components/TaskModal';
import { MemberModal } from '../components/MemberModal';
import { GoalModal } from '../components/GoalModal';
import { TaskDetailsDrawer } from '../components/TaskDetailsDrawer';
import { RescheduleModal } from '../components/RescheduleModal';

export const DashboardPage: React.FC = () => {
  const { members, membersMap, refreshMembers, showToast } = useApp();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [missedByMember, setMissedByMember] = useState<{ memberName: string; missedCount: number; activeTaskCount: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [goalsSummary, setGoalsSummary] = useState<any>(null);
  const [todayDate, setTodayDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Modals state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [dashData, allTasks] = await Promise.all([
        api.getDashboard(),
        api.getTasks(),
      ]);

      setMetrics(dashData.metrics);
      setUpcomingTasks(dashData.upcomingTasks);
      setMissedByMember(dashData.missedByMember);
      setRecentActivity(dashData.recentActivity);
      setGoalsSummary(dashData.goalsSummary);
      setTodayDate(dashData.today);
      setTasks(allTasks);
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLoadSampleData = async () => {
    setLoadingSample(true);
    try {
      await api.loadSampleData();
      showToast('Sample dataset loaded (15 tasks, 5 staff members, 4 goals)', 'success');
      await refreshMembers();
      await loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to load sample data', 'error');
    } finally {
      setLoadingSample(false);
    }
  };

  // Filtered task scope for interactive metric computation
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedMember !== 'all' && !t.assigneeIds.includes(selectedMember)) return false;
      if (selectedDepartment !== 'all' && t.department !== selectedDepartment) return false;
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
      return true;
    });
  }, [tasks, selectedMember, selectedDepartment, selectedPriority]);

  // Dynamic KPI calculations based on filters
  const computedMetrics = useMemo(() => {
    if (!metrics) return null;
    if (selectedMember === 'all' && selectedDepartment === 'all' && selectedPriority === 'all') {
      return metrics;
    }

    const total = filteredTasks.length;
    const toDo = filteredTasks.filter((t) => t.status === 'To Do').length;
    const inProgress = filteredTasks.filter((t) => t.status === 'In Progress').length;
    const completed = filteredTasks.filter((t) => t.status === 'Completed').length;
    const onHold = filteredTasks.filter((t) => t.status === 'On Hold').length;
    const currentlyOverdue = filteredTasks.filter(
      (t) => t.status !== 'Completed' && t.currentTargetDate < todayDate
    ).length;
    const totalMissed = filteredTasks.reduce((sum, t) => sum + (t.missedDeadlineCount || 0), 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalTasks: total,
      toDo,
      inProgress,
      completed,
      onHold,
      currentlyOverdue,
      totalMissedTargets: totalMissed,
      activeTeamMembers: metrics.activeTeamMembers,
      overallCompletionRate: completionRate,
      goalsAchieved: metrics.goalsAchieved,
      totalGoals: metrics.totalGoals,
    };
  }, [metrics, filteredTasks, selectedMember, selectedDepartment, selectedPriority, todayDate]);

  // Chart data
  const statusPieData = useMemo(() => {
    if (!computedMetrics) return [];
    return [
      { name: 'Completed', value: computedMetrics.completed, color: '#10b981' },
      { name: 'In Progress', value: computedMetrics.inProgress, color: '#3b82f6' },
      { name: 'To Do', value: computedMetrics.toDo, color: '#64748b' },
      { name: 'On Hold', value: computedMetrics.onHold, color: '#f59e0b' },
    ].filter((item) => item.value > 0);
  }, [computedMetrics]);

  const priorityBarData = useMemo(() => {
    return [
      { name: 'Critical', count: filteredTasks.filter((t) => t.priority === 'Critical').length, fill: '#ef4444' },
      { name: 'High', count: filteredTasks.filter((t) => t.priority === 'High').length, fill: '#f97316' },
      { name: 'Medium', count: filteredTasks.filter((t) => t.priority === 'Medium').length, fill: '#3b82f6' },
      { name: 'Low', count: filteredTasks.filter((t) => t.priority === 'Low').length, fill: '#94a3b8' },
    ];
  }, [filteredTasks]);

  const departments = useMemo(() => {
    return Array.from(new Set(tasks.map((t) => t.department).filter(Boolean)));
  }, [tasks]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Executive Task & Goal Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time workload, deadline compliance, and team milestone tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tasks.length === 0 && (
            <button
              onClick={handleLoadSampleData}
              disabled={loadingSample}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>{loadingSample ? 'Loading Demo Data...' : '⚡ Load Sample Data'}</span>
            </button>
          )}

          <button
            onClick={() => setShowTaskModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>

          <button
            onClick={() => setShowGoalModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Target className="w-3.5 h-3.5 text-emerald-500" />
            <span>New Goal</span>
          </button>

          <button
            onClick={() => setShowMemberModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-purple-500" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Scope:</span>
        </div>

        {/* Member filter */}
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Team Members ({members.length})</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName} ({m.employeeCode})
            </option>
          ))}
        </select>

        {/* Department filter */}
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {(selectedMember !== 'all' || selectedDepartment !== 'all' || selectedPriority !== 'all') && (
          <button
            onClick={() => {
              setSelectedMember('all');
              setSelectedDepartment('all');
              setSelectedPriority('all');
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* =========================================================================
          10 KPI CARDS GRID (Section 5 Requirement)
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Total Tasks */}
        <div
          onClick={() => navigate('/tasks')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {computedMetrics?.totalTasks ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">In current filter scope</div>
        </div>

        {/* 2. To Do */}
        <div
          onClick={() => navigate('/tasks?status=To Do')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">To Do</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">
            {computedMetrics?.toDo ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Pending kickoff</div>
        </div>

        {/* 3. In Progress */}
        <div
          onClick={() => navigate('/tasks?status=In Progress')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">In Progress</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {computedMetrics?.inProgress ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Active execution</div>
        </div>

        {/* 4. Completed */}
        <div
          onClick={() => navigate('/tasks?status=Completed')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span>
            <CheckSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {computedMetrics?.completed ?? 0}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">100% progress closed</div>
        </div>

        {/* 5. On Hold */}
        <div
          onClick={() => navigate('/tasks?status=On Hold')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">On Hold</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {computedMetrics?.onHold ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Blocked or paused</div>
        </div>

        {/* 6. Currently Overdue (Distinct KPI) */}
        <div
          onClick={() => navigate('/overdue')}
          className="p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-xs hover:border-rose-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Currently Overdue</span>
            <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
            {computedMetrics?.currentlyOverdue ?? 0}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
            Active past current target date
          </div>
        </div>

        {/* 7. Total Missed Targets (Historical Events) */}
        <div
          onClick={() => navigate('/reports')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Missed Targets</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {computedMetrics?.totalMissedTargets ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Cumulative missed deadlines</div>
        </div>

        {/* 8. Active Team Members */}
        <div
          onClick={() => navigate('/team')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Staff</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {computedMetrics?.activeTeamMembers ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Non-deactivated members</div>
        </div>

        {/* 9. Overall Completion Rate */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {computedMetrics?.overallCompletionRate ?? 0}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${computedMetrics?.overallCompletionRate ?? 0}%` }}
            />
          </div>
        </div>

        {/* 10. Goals Achieved */}
        <div
          onClick={() => navigate('/goals')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Goals Achieved</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {computedMetrics?.goalsAchieved ?? 0} <span className="text-xs font-normal text-slate-400">/ {computedMetrics?.totalGoals ?? 0}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Measurable targets met</div>
        </div>
      </div>

      {/* =========================================================================
          DASHBOARD CHARTS (Section 5 Requirement)
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown Doughnut Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Task Status Breakdown</h3>
            <span className="text-xs text-slate-400">{filteredTasks.length} tasks</span>
          </div>
          <div className="h-56">
            {statusPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No tasks in current scope</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend textAnchor="middle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tasks by Priority Bar Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Workload by Priority</h3>
            <span className="text-xs text-slate-400">Critical to Low</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityBarData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Missed Targets By Team Member Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Missed Targets by Member</h3>
            <span className="text-xs text-rose-500 font-semibold">Audit summary</span>
          </div>
          <div className="h-56">
            {missedByMember.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missedByMember}>
                  <XAxis dataKey="memberName" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={40} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="missedCount" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Missed Targets" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          UPCOMING 7-DAY DEADLINES & RECENT ACTIVITY FEED
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines for next 7 days */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Upcoming 7-Day Deadlines</h3>
            </div>
            <button
              onClick={() => navigate('/calendar')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Calendar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {upcomingTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active tasks due in the next 7 days.
              </div>
            ) : (
              upcomingTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{t.project}</span>
                      <span>•</span>
                      <span>
                        Assignees:{' '}
                        {t.assigneeIds.map((id) => membersMap.get(id)?.fullName || id).join(', ') || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {t.currentTargetDate}
                    </div>
                    <div className="text-[10px] text-slate-400">{t.progress}% done</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Activity Trail</h3>
            </div>
            <button
              onClick={() => navigate('/activity')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No activity logged yet.</div>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{log.details}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals & Drawers */}
      <TaskModal
        task={null}
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSuccess={() => loadDashboardData()}
      />
      <MemberModal
        member={null}
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        onSuccess={() => {
          refreshMembers();
          loadDashboardData();
        }}
      />
      <GoalModal
        goal={null}
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onSuccess={() => loadDashboardData()}
      />
      <TaskDetailsDrawer
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onRefresh={() => loadDashboardData()}
      />
      <RescheduleModal
        task={rescheduleTask}
        isOpen={!!rescheduleTask}
        onClose={() => setRescheduleTask(null)}
        onSuccess={() => loadDashboardData()}
      />
    </div>
  );
};
