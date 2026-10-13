import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CheckSquare, Users, Target, ArrowRight } from 'lucide-react';
import { api, Task, TeamMember, Goal } from '../services/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([api.getTasks(), api.getTeamMembers(), api.getGoals()])
        .then(([t, m, g]) => {
          setTasks(t);
          setMembers(m);
          setGoals(g);
        })
        .finally(() => setLoading(false));
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredTasks = q
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.project.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q)
      )
    : tasks.slice(0, 4);

  const filteredMembers = q
    ? members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.employeeCode.toLowerCase().includes(q) ||
          m.department.toLowerCase().includes(q) ||
          m.designation.toLowerCase().includes(q)
      )
    : members.slice(0, 3);

  const filteredGoals = q
    ? goals.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.project.toLowerCase().includes(q) ||
          g.department.toLowerCase().includes(q)
      )
    : goals.slice(0, 3);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, team members, goals, or projects..."
            className="flex-1 text-base bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading workspace index...</div>
          ) : (
            <>
              {/* Tasks Section */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                  <span>Tasks ({filteredTasks.length})</span>
                </div>
                {filteredTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-6">No matching tasks found.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleSelect(`/tasks?highlight=${t.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              t.status === 'Completed'
                                ? 'bg-emerald-500'
                                : t.status === 'In Progress'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {t.title}
                            </div>
                            <div className="text-xs text-slate-400">
                              {t.project} • Due: {t.currentTargetDate} • Priority: {t.priority}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Members Section */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>Team Members ({filteredMembers.length})</span>
                </div>
                {filteredMembers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-6">No matching staff members found.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelect(`/team?member=${m.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center justify-center">
                            {m.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                              {m.fullName}
                            </div>
                            <div className="text-xs text-slate-400">
                              {m.designation} • {m.department} ({m.employeeCode})
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Goals Section */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span>Goals & Targets ({filteredGoals.length})</span>
                </div>
                {filteredGoals.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-6">No matching goals found.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredGoals.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => handleSelect(`/goals?goal=${g.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            {g.title}
                          </div>
                          <div className="text-xs text-slate-400">
                            {g.currentAchievementValue} / {g.targetValue} {g.unitOfMeasurement} ({g.progress}%) • Target: {g.targetDate}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between items-center">
          <span>Navigate with click or arrow keys</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
