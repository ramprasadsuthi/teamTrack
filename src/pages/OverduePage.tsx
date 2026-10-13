import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api, Task } from '../services/api';
import { useApp } from '../context/AppContext';
import { RescheduleModal } from '../components/RescheduleModal';
import { TaskDetailsDrawer } from '../components/TaskDetailsDrawer';

export const OverduePage: React.FC = () => {
  const { membersMap, showToast } = useApp();
  const [overdueTasks, setOverdueTasks] = useState<(Task & { isOverdue?: boolean; daysOverdue?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchOverdue = async () => {
    setLoading(true);
    try {
      const allTasks = await api.getTasks();
      const overdue = allTasks.filter((t) => t.isOverdue);
      // Sort descending by days overdue
      overdue.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
      setOverdueTasks(overdue);
    } catch (err: any) {
      showToast(err.message || 'Failed to load overdue tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight">Overdue Task Action Center</h1>
            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold">
              {overdueTasks.length} Overdue
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Tasks past their active target date. Review reasons, align with staff, and reschedule deadlines.
          </p>
        </div>
      </div>

      {/* Overdue Task Cards Table */}
      <div className="space-y-3">
        {overdueTasks.length === 0 ? (
          <div className="p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-base">
              Zero Overdue Tasks!
            </div>
            <div className="text-xs text-slate-400 max-w-sm mx-auto">
              All staff tasks are currently either completed or within their active target deadlines.
            </div>
          </div>
        ) : (
          overdueTasks.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/70 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:shadow-md transition-all"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      t.priority === 'Critical'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {t.priority}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t.project} • {t.department}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t.daysOverdue} day{(t.daysOverdue !== 1 ? 's' : '')} overdue
                  </span>
                </div>

                <div
                  onClick={() => setSelectedTaskId(t.id)}
                  className="font-bold text-base text-slate-900 dark:text-white hover:text-blue-600 cursor-pointer"
                >
                  {t.title}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    <span>Assignee: </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {t.assigneeIds.map((id) => membersMap.get(id)?.fullName || id).join(', ') || 'Unassigned'}
                    </strong>
                  </div>
                  <div>
                    <span>Target Date: </span>
                    <strong className="text-rose-600 dark:text-rose-400 font-mono">
                      {t.currentTargetDate}
                    </strong>
                  </div>
                  <div>
                    <span>Historical Missed Targets: </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {t.missedDeadlineCount || 0}
                    </strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3 pt-1 max-w-md">
                  <span className="text-[11px] text-slate-400 w-16">Progress: {t.progress}%</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${t.progress}%` }} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedTaskId(t.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
                <button
                  onClick={() => setRescheduleTask(t)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reschedule Deadline</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <RescheduleModal
        task={rescheduleTask}
        isOpen={!!rescheduleTask}
        onClose={() => setRescheduleTask(null)}
        onSuccess={() => fetchOverdue()}
      />

      <TaskDetailsDrawer
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onRefresh={() => fetchOverdue()}
      />
    </div>
  );
};
