import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Edit,
  Trash2,
  ChevronRight,
  TrendingUp,
  FolderKanban,
} from 'lucide-react';
import { api, Goal } from '../services/api';
import { useApp } from '../context/AppContext';
import { GoalModal } from '../components/GoalModal';

export const GoalsPage: React.FC = () => {
  const { membersMap, showToast } = useApp();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load goals', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleDeleteGoal = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete goal "${title}"?`)) return;
    try {
      await api.deleteGoal(id);
      showToast(`Goal "${title}" deleted`, 'success');
      await fetchGoals();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete goal', 'error');
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!g.title.toLowerCase().includes(q) && !g.project.toLowerCase().includes(q)) return false;
    }
    if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Goals & Measurable Targets</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              {filteredGoals.length} goals
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Strategic milestones, quantifiable outcomes, and team deliverable targets
          </p>
        </div>

        <button
          onClick={() => setShowGoalModal(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search goals by title or project..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Categories</option>
          <option value="Individual">Individual</option>
          <option value="Team">Team</option>
          <option value="Project">Project</option>
          <option value="Quarterly">Quarterly</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Statuses</option>
          <option value="In Progress">In Progress</option>
          <option value="Achieved">Achieved</option>
          <option value="At Risk">At Risk</option>
          <option value="Overdue">Overdue</option>
          <option value="Not Started">Not Started</option>
        </select>
      </div>

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            No goals found matching your search.
          </div>
        ) : (
          filteredGoals.map((g) => (
            <div
              key={g.id}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs space-y-4 transition-all ${
                g.status === 'Achieved'
                  ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20'
                  : g.status === 'Overdue'
                  ? 'border-rose-300 dark:border-rose-800/80'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {g.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {g.project} • {g.department}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {g.title}
                  </h3>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                    g.status === 'Achieved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : g.status === 'Overdue'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : g.status === 'At Risk'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}
                >
                  {g.status}
                </span>
              </div>

              {g.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {g.description}
                </p>
              )}

              {/* Measurable Achievement Metric Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Achievement Target:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {g.currentAchievementValue} / {g.targetValue} {g.unitOfMeasurement}
                  </span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      g.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, g.progress)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Progress: {g.progress}%</span>
                  <span>Target Date: {g.targetDate}</span>
                </div>
              </div>

              {/* Responsible owners */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span>Owners:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {g.ownerIds.map((id: string) => membersMap.get(id)?.fullName || id).join(', ') || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingGoal(g)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit goal"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(g.id, g.title)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                    title="Delete goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <GoalModal
        goal={editingGoal}
        isOpen={showGoalModal || !!editingGoal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }}
        onSuccess={() => fetchGoals()}
      />
    </div>
  );
};
