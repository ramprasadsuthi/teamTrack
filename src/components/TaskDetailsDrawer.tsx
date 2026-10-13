import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertCircle,
  Clock,
  History,
  MessageSquare,
  CheckCircle,
  RotateCcw,
  Edit,
  Trash2,
  Send,
  Flag,
  Target,
  Sparkles,
} from 'lucide-react';
import { Task, DeadlineHistoryItem, MissedDeadlineEvent, Comment, api } from '../services/api';
import { useApp } from '../context/AppContext';
import { RescheduleModal } from './RescheduleModal';

interface TaskDetailsDrawerProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onEditTask?: (task: Task) => void;
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
  taskId,
  isOpen,
  onClose,
  onRefresh,
  onEditTask,
}) => {
  const { membersMap, showToast } = useApp();
  const [task, setTask] = useState<
    | (Task & {
        isOverdue?: boolean;
        daysOverdue?: number;
        deadlineHistory: DeadlineHistoryItem[];
        missedDeadlines: MissedDeadlineEvent[];
        comments: Comment[];
      })
    | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [progressVal, setProgressVal] = useState<number>(0);

  const fetchTaskDetails = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getTask(id);
      setTask(data);
      setProgressVal(data.progress);
    } catch (err: any) {
      showToast(err.message || 'Failed to load task details', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails(taskId);
    } else {
      setTask(null);
    }
  }, [isOpen, taskId]);

  if (!isOpen || !taskId) return null;

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task) return;
    try {
      await api.updateTaskStatus(task.id, newStatus);
      showToast(`Status updated to ${newStatus}`, 'success');
      await fetchTaskDetails(task.id);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleProgressSave = async () => {
    if (!task) return;
    try {
      await api.updateTaskProgress(task.id, progressVal);
      showToast(`Progress set to ${progressVal}%`, 'success');
      await fetchTaskDetails(task.id);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update progress', 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;

    setAddingComment(true);
    try {
      await api.addTaskComment(task.id, newComment.trim(), 'Administrator');
      setNewComment('');
      showToast('Comment posted', 'info');
      await fetchTaskDetails(task.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to add comment', 'error');
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (!window.confirm(`Are you sure you want to permanently delete task "${task.title}"?`)) {
      return;
    }
    try {
      await api.deleteTask(task.id);
      showToast('Task deleted successfully', 'success');
      onRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        >
          {loading || !task ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Loading task details...
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        task.priority === 'Critical'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : task.priority === 'High'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {task.priority} Priority
                    </span>
                    <span className="text-xs text-slate-400">
                      {task.project} • {task.department}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {task.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onEditTask && (
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Edit task"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={handleDeleteTask}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Overdue Warning Callout */}
                {task.isOverdue && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                          Task is Overdue by {task.daysOverdue} day{task.daysOverdue !== 1 ? 's' : ''}!
                        </div>
                        <div className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                          Target date was {task.currentTargetDate}. {task.missedDeadlineCount || 0} missed deadline event(s) recorded.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRescheduleModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
                    >
                      Reschedule Now
                    </button>
                  </div>
                )}

                {/* Deadlines & Target Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Original Target</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {task.originalTargetDate}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Current Target</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {task.currentTargetDate}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Missed Targets</div>
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                      {task.missedDeadlineCount || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Revisions</div>
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {task.deadlineRevisionCount || 0}
                    </div>
                  </div>
                </div>

                {/* Status and Progress Controls */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</span>
                    <div className="flex items-center gap-1.5">
                      {(['To Do', 'In Progress', 'On Hold', 'Completed'] as Task['status'][]).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(st)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            task.status === st
                              ? st === 'Completed'
                                ? 'bg-emerald-600 text-white font-semibold'
                                : st === 'In Progress'
                                ? 'bg-blue-600 text-white font-semibold'
                                : st === 'On Hold'
                                ? 'bg-amber-600 text-white font-semibold'
                                : 'bg-slate-700 text-white font-semibold'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Progress slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Task Progress</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{progressVal}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progressVal}
                        onChange={(e) => setProgressVal(Number(e.target.value))}
                        className="flex-1 accent-blue-600 cursor-pointer"
                      />
                      <button
                        onClick={handleProgressSave}
                        disabled={progressVal === task.progress}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Description</h4>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {task.description || <span className="italic text-slate-400">No description provided.</span>}
                  </div>
                </div>

                {/* Assignees */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Assigned Staff</h4>
                  {task.assigneeIds.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No team members assigned.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {task.assigneeIds.map((id) => {
                        const member = membersMap.get(id);
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                          >
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center">
                              {member ? member.fullName.charAt(0) : '?'}
                            </div>
                            <span className="font-medium">{member ? member.fullName : id}</span>
                            {member && <span className="text-[10px] text-slate-400">({member.designation})</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reschedule Trigger Action */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                  <div>
                    <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">Need to adjust deadline?</div>
                    <div className="text-[11px] text-blue-700 dark:text-blue-400">
                      Current Target Date: {task.currentTargetDate}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Reschedule Deadline
                  </button>
                </div>

                {/* Deadline Revision History */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    <History className="w-4 h-4 text-amber-500" />
                    <span>Deadline Revision History ({task.deadlineHistory?.length || 0})</span>
                  </div>
                  {!task.deadlineHistory || task.deadlineHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-6">No revisions recorded yet. Target date is original.</p>
                  ) : (
                    <div className="space-y-2.5 border-l-2 border-amber-200 dark:border-amber-900 ml-2 pl-4">
                      {task.deadlineHistory.map((h) => (
                        <div
                          key={h.id}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                            <span>
                              {h.previousTargetDate} → <strong className="text-blue-600 dark:text-blue-400">{h.newTargetDate}</strong>
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {new Date(h.revisionTimestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            <strong>Reason:</strong> {h.reason}
                          </div>
                          {h.adminRemarks && (
                            <div className="text-slate-500 text-[11px] italic">
                              Remarks: {h.adminRemarks}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400">
                            Rescheduled by {h.rescheduledBy} {h.wasOverdueAtReschedule ? '• (Was Overdue)' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missed Deadline Events History */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>Recorded Missed Deadlines ({task.missedDeadlines?.length || 0})</span>
                  </div>
                  {!task.missedDeadlines || task.missedDeadlines.length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-6">No missed deadlines recorded for this task.</p>
                  ) : (
                    <div className="space-y-2 border-l-2 border-rose-300 dark:border-rose-900 ml-2 pl-4">
                      {task.missedDeadlines.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs"
                        >
                          <div className="flex justify-between font-medium text-rose-800 dark:text-rose-200">
                            <span>Missed target date: {m.targetDateMissed}</span>
                            <span className="text-[10px] text-rose-500">{new Date(m.detectedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-rose-600 dark:text-rose-400 text-[11px] mt-0.5">
                            {m.reasonRecorded || 'Target date passed without completion'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span>Progress Updates & Comments ({task.comments?.length || 0})</span>
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a remark or progress note..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="submit"
                      disabled={addingComment || !newComment.trim()}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </button>
                  </form>

                  <div className="space-y-2">
                    {task.comments?.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {c.authorName} <span className="text-[10px] text-slate-400 font-normal">({c.authorRole})</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 leading-relaxed">{c.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Embedded Reschedule Modal */}
      <RescheduleModal
        task={task}
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onSuccess={() => {
          if (task) fetchTaskDetails(task.id);
          onRefresh();
        }}
      />
    </>
  );
};
