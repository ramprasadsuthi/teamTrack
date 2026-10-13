import React, { useState, useEffect } from 'react';
import { X, Target, AlertTriangle } from 'lucide-react';
import { Goal, api } from '../services/api';
import { useApp } from '../context/AppContext';

interface GoalModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ goal, isOpen, onClose, onSuccess }) => {
  const { members, showToast } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [department, setDepartment] = useState('Engineering');
  const [project, setProject] = useState('Core Platform');
  const [category, setCategory] = useState<Goal['category']>('Team');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetValue, setTargetValue] = useState<number>(10);
  const [currentAchievementValue, setCurrentAchievementValue] = useState<number>(0);
  const [unitOfMeasurement, setUnitOfMeasurement] = useState('tasks');
  const [status, setStatus] = useState<Goal['status']>('In Progress');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (goal) {
        setTitle(goal.title);
        setDescription(goal.description);
        setOwnerIds(goal.ownerIds || []);
        setDepartment(goal.department);
        setProject(goal.project);
        setCategory(goal.category);
        setStartDate(goal.startDate);
        setTargetDate(goal.targetDate);
        setTargetValue(goal.targetValue);
        setCurrentAchievementValue(goal.currentAchievementValue);
        setUnitOfMeasurement(goal.unitOfMeasurement);
        setStatus(goal.status);
        setNotes(goal.notes || '');
      } else {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        setTitle('');
        setDescription('');
        setOwnerIds([]);
        setDepartment('Quality Assurance');
        setProject('Regression Suite');
        setCategory('Team');
        setStartDate(today);
        setTargetDate(today);
        setTargetValue(10);
        setCurrentAchievementValue(0);
        setUnitOfMeasurement('scripts');
        setStatus('In Progress');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, goal]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Goal title is required.');
      return;
    }
    if (!targetDate) {
      setError('Target deadline date is required.');
      return;
    }
    if (targetValue <= 0) {
      setError('Target value must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      if (goal) {
        await api.updateGoal(goal.id, {
          title: title.trim(),
          description: description.trim(),
          ownerIds,
          department,
          project,
          category,
          startDate,
          targetDate,
          targetValue: Number(targetValue),
          currentAchievementValue: Number(currentAchievementValue),
          unitOfMeasurement: unitOfMeasurement.trim(),
          status,
          notes: notes.trim(),
        });
        showToast(`Goal "${title}" updated`, 'success');
      } else {
        await api.createGoal({
          title: title.trim(),
          description: description.trim(),
          ownerIds,
          department,
          project,
          category,
          startDate,
          targetDate,
          targetValue: Number(targetValue),
          currentAchievementValue: Number(currentAchievementValue),
          unitOfMeasurement: unitOfMeasurement.trim(),
          status,
          linkedTaskIds: [],
          notes: notes.trim(),
        });
        showToast(`Goal "${title}" created successfully`, 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleOwner = (id: string) => {
    setOwnerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                {goal ? 'Edit Goal & Target' : 'Create Measurable Goal'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define measurable deliverables and tracking metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Goal Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete 10 automation test scripts by 25 October"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Goal Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, strategic objective, and deliverables..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Individual">Individual Goal</option>
                <option value="Team">Team Goal</option>
                <option value="Project">Project Milestone</option>
                <option value="Quarterly">Quarterly Objective</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Achieved">Achieved</option>
                <option value="At Risk">At Risk</option>
                <option value="Overdue">Overdue</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Measurable Target Metric */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
            <span className="font-semibold text-emerald-900 dark:text-emerald-300 block">
              Measurable Achievement Values
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Current Achieved
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={currentAchievementValue}
                  onChange={(e) => setCurrentAchievementValue(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Target Value <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Unit of Metric
                </label>
                <input
                  type="text"
                  value={unitOfMeasurement}
                  onChange={(e) => setUnitOfMeasurement(e.target.value)}
                  placeholder="e.g. scripts, defects..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Calculated Progress: {Math.min(100, Math.round((currentAchievementValue / (targetValue || 1)) * 100))}%
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Deadline <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Owner Assignment */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Goal Owners / Responsible Staff
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {members.length === 0 ? (
                <span className="text-slate-400 italic">No staff members available.</span>
              ) : (
                members.map((m) => {
                  const isSelected = ownerIds.includes(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => toggleOwner(m.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.fullName}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
