import React, { useState } from 'react';
import { X, Calendar, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { Task, api } from '../services/api';
import { useApp } from '../context/AppContext';

interface RescheduleModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ task, isOpen, onClose, onSuccess }) => {
  const { showToast } = useApp();
  const [newTargetDate, setNewTargetDate] = useState('');
  const [reason, setReason] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newTargetDate) {
      setError('Please select a new target deadline date.');
      return;
    }
    if (!reason.trim()) {
      setError('A mandatory reason for rescheduling must be provided.');
      return;
    }

    setSubmitting(true);
    try {
      await api.rescheduleTask(task.id, {
        newTargetDate,
        reason: reason.trim(),
        adminRemarks: adminRemarks.trim() || undefined,
      });
      showToast(`Task "${task.title}" rescheduled to ${newTargetDate}`, 'success');
      onSuccess();
      onClose();
      // Reset
      setNewTargetDate('');
      setReason('');
      setAdminRemarks('');
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">Reschedule Task Deadline</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Formal deadline extension with immutable audit log</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Info Pill */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{task.title}</div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Original Deadline</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{task.originalTargetDate}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Current Target</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{task.currentTargetDate}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Missed Targets</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {task.missedDeadlineCount || 0} event{(task.missedDeadlineCount || 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* New Target Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Target Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Original target date ({task.originalTargetDate}) will remain permanently preserved in historical records.
            </p>
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Rescheduling <span className="text-rose-500">* (Mandatory)</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Additional practice examples required, partner API delayed..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Optional Admin Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Administrator Remarks <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              placeholder="Additional internal guidance or review notes..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Business rules indicator */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>This action records revision #{(task.deadlineRevisionCount || 0) + 1} and appends to immutable audit history.</span>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Confirm Reschedule'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
