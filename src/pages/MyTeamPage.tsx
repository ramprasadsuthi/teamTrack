import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  TrendingUp,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { api, TeamMember, Task, Goal } from '../services/api';
import { useApp } from '../context/AppContext';
import { TaskDetailsDrawer } from '../components/TaskDetailsDrawer';

export const MyTeamPage: React.FC = () => {
  const { showToast } = useApp();
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, tasksData, goalsData] = await Promise.all([
        api.getTeamMembers(),
        api.getTasks(),
        api.getGoals(),
      ]);
      setMembers(membersData);
      setTasks(tasksData);
      setGoals(goalsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load team data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>My Team Overview & Workload</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manager perspective: individual capacity, goal progress, and deadline compliance
        </p>
      </div>

      {/* Staff Capacity & Performance Cards */}
      <div className="space-y-4">
        {members.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No team members registered.</div>
        ) : (
          members.map((m) => {
            const memberTasks = tasks.filter((t) => t.assigneeIds.includes(m.id));
            const memberGoals = goals.filter((g) => g.ownerIds.includes(m.id));

            return (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
              >
                {/* Member Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.fullName}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                        {m.fullName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{m.fullName}</span>
                        <span className="font-mono text-xs text-slate-400">({m.employeeCode})</span>
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {m.designation} • {m.department}
                      </div>
                    </div>
                  </div>

                  {/* High level rates */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Completion Rate</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {m.stats?.completionRate ?? 0}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Missed Targets</div>
                      <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {m.stats?.missedCount ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5-Metric Breakdown Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] uppercase text-slate-400 font-semibold">Assigned Tasks</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {m.stats?.totalAssigned ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/50">
                    <div className="text-[10px] uppercase text-blue-600 dark:text-blue-400 font-semibold">In Progress</div>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                      {m.stats?.inProgress ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50">
                    <div className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-semibold">Completed</div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {m.stats?.completed ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50">
                    <div className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-semibold">To Do / Pending</div>
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                      {m.stats?.toDo ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/50">
                    <div className="text-[10px] uppercase text-rose-600 dark:text-rose-400 font-semibold">Overdue</div>
                    <div className="text-sm font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                      {m.stats?.overdue ?? 0}
                    </div>
                  </div>
                </div>

                {/* Goals section */}
                {memberGoals.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Linked Goals ({memberGoals.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {memberGoals.map((g) => (
                        <div
                          key={g.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                            <span className="truncate">{g.title}</span>
                            <span className="text-emerald-600 shrink-0 ml-2">{g.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${g.progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Tasks preview list */}
                {memberTasks.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Active Tasks
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {memberTasks.slice(0, 5).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                          />
                          <span className="truncate max-w-[200px]">{t.title}</span>
                        </button>
                      ))}
                      {memberTasks.length > 5 && (
                        <span className="text-xs text-slate-400 self-center">
                          +{memberTasks.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <TaskDetailsDrawer
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onRefresh={() => loadData()}
      />
    </div>
  );
};
