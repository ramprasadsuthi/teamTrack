import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Columns,
  List,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  MoreVertical,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Edit,
  Trash2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api, Task } from '../services/api';
import { useApp } from '../context/AppContext';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailsDrawer } from '../components/TaskDetailsDrawer';
import { RescheduleModal } from '../components/RescheduleModal';

export const TasksPage: React.FC = () => {
  const { members, membersMap, showToast } = useApp();
  const [searchParams] = useSearchParams();

  const [tasks, setTasks] = useState<(Task & { isOverdue?: boolean; daysOverdue?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<'currentTargetDate' | 'priority' | 'progress' | 'title'>('currentTargetDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(searchParams.get('highlight') || null);
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleQuickStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      showToast(`Task status changed to ${newStatus}`, 'success');
      await fetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleQuickProgressChange = async (taskId: string, progress: number) => {
    try {
      await api.updateTaskProgress(taskId, progress);
      await fetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to update progress', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete task "${title}"?`)) return;
    try {
      await api.deleteTask(taskId);
      showToast(`Deleted task "${title}"`, 'success');
      await fetchTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesProject = t.project.toLowerCase().includes(q);
        const matchesDept = t.department.toLowerCase().includes(q);
        if (!matchesTitle && !matchesProject && !matchesDept) return false;
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && !t.assigneeIds.includes(assigneeFilter)) return false;
      if (departmentFilter !== 'all' && t.department !== departmentFilter) return false;
      if (overdueOnly && !t.isOverdue) return false;
      return true;
    });

    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'priority') {
        const pOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        valA = pOrder[a.priority] || 0;
        valB = pOrder[b.priority] || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, departmentFilter, overdueOnly, sortField, sortOrder]);

  const departments = useMemo(() => Array.from(new Set(tasks.map((t) => t.department).filter(Boolean))), [tasks]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Staff Task Management</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              {filteredTasks.length} tasks
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track execution, deadlines, missed targets, and schedule adjustments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle (Table vs Kanban) */}
          <div className="p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 flex items-center">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, project, department..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>

          {/* Overdue checkbox */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded accent-rose-600"
            />
            <span className={overdueOnly ? 'text-rose-600 font-semibold' : ''}>Overdue Only</span>
          </label>
        </div>
      </div>

      {/* =========================================================================
          TABLE VIEW (Section 7 Columns Requirement)
      ========================================================================= */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-slate-800" onClick={() => {
                    setSortField('priority');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}>
                    <div className="flex items-center gap-1">
                      <span>Priority</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Orig. Target</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-slate-800" onClick={() => {
                    setSortField('currentTargetDate');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}>
                    <div className="flex items-center gap-1">
                      <span>Current Target</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-4 text-center">Missed Targets</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No tasks found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        t.isOverdue ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Task Title */}
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-xs">
                        <div
                          onClick={() => setSelectedTaskId(t.id)}
                          className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      </td>

                      {/* Assigned member */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-[160px]">
                          {t.assigneeIds.length === 0 ? (
                            <span className="text-slate-400 italic">None</span>
                          ) : (
                            t.assigneeIds.map((id) => (
                              <span
                                key={id}
                                className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 truncate"
                              >
                                {membersMap.get(id)?.fullName || id}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Project */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {t.project}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            t.priority === 'Critical'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : t.priority === 'High'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : t.priority === 'Medium'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <select
                          value={t.status}
                          onChange={(e) => handleQuickStatusChange(t.id, e.target.value as any)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium border-none cursor-pointer ${
                            t.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : t.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : t.status === 'On Hold'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>

                      {/* Original Target Date */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {t.originalTargetDate}
                      </td>

                      {/* Current Target Date */}
                      <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        {t.currentTargetDate}
                      </td>

                      {/* Days Overdue */}
                      <td className="py-3 px-4 text-center">
                        {t.isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                            {t.daysOverdue}d
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Missed-target count */}
                      <td className="py-3 px-4 text-center">
                        {t.missedDeadlineCount > 0 ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {t.missedDeadlineCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* Progress */}
                      <td className="py-3 px-4 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                t.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${t.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 w-7 text-right">{t.progress}%</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setRescheduleTask(t)}
                            title="Reschedule Deadline"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingTask(t)}
                            title="Edit Task"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedTaskId(t.id)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(t.id, t.title)}
                            title="Delete Task"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* =========================================================================
            KANBAN VIEW (Section 11 Requirement: To Do, In Progress, On Hold, Completed)
        ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['To Do', 'In Progress', 'On Hold', 'Completed'] as Task['status'][]).map((columnStatus) => {
            const columnTasks = filteredTasks.filter((t) => t.status === columnStatus);
            return (
              <div
                key={columnStatus}
                className="bg-slate-100/70 dark:bg-slate-900/50 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[75vh]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        columnStatus === 'Completed'
                          ? 'bg-emerald-500'
                          : columnStatus === 'In Progress'
                          ? 'bg-blue-500'
                          : columnStatus === 'On Hold'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {columnStatus}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-[10px] font-semibold text-slate-500">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                  {columnTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">No tasks</div>
                  ) : (
                    columnTasks.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border shadow-xs space-y-2.5 cursor-pointer hover:shadow-md transition-all ${
                          t.isOverdue
                            ? 'border-rose-300 dark:border-rose-800'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              t.priority === 'Critical'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : t.priority === 'High'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {t.priority}
                          </span>
                          {t.missedDeadlineCount > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              {t.missedDeadlineCount}
                            </span>
                          )}
                        </div>

                        <div
                          onClick={() => setSelectedTaskId(t.id)}
                          className="font-semibold text-xs text-slate-900 dark:text-white hover:text-blue-600"
                        >
                          {t.title}
                        </div>

                        <div className="text-[10px] text-slate-400">
                          {t.project} • {t.department}
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Progress</span>
                            <span>{t.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full"
                              style={{ width: `${t.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer: Date & Reschedule button */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px]">
                          <span
                            className={`font-semibold ${
                              t.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                            }`}
                          >
                            Due: {t.currentTargetDate}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRescheduleTask(t);
                              }}
                              className="p-1 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                              title="Reschedule"
                            >
                              <Calendar className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskId(t.id);
                              }}
                              className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals & Drawers */}
      <TaskModal
        task={editingTask}
        isOpen={showCreateModal || !!editingTask}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTask(null);
        }}
        onSuccess={() => fetchTasks()}
      />

      <TaskDetailsDrawer
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onRefresh={() => fetchTasks()}
        onEditTask={(t) => {
          setSelectedTaskId(null);
          setEditingTask(t);
        }}
      />

      <RescheduleModal
        task={rescheduleTask}
        isOpen={!!rescheduleTask}
        onClose={() => setRescheduleTask(null)}
        onSuccess={() => fetchTasks()}
      />
    </div>
  );
};
