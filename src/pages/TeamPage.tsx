import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Briefcase,
  Edit,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api, TeamMember, Task } from '../services/api';
import { useApp } from '../context/AppContext';
import { MemberModal } from '../components/MemberModal';
import { TaskDetailsDrawer } from '../components/TaskDetailsDrawer';

export const TeamPage: React.FC = () => {
  const { refreshMembers, showToast } = useApp();
  const [searchParams] = useSearchParams();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedMemberTasks, setSelectedMemberTasks] = useState<{ member: TeamMember; tasks: Task[] } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const data = await api.getTeamMembers();
      setMembers(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleToggleStatus = async (member: TeamMember) => {
    const nextStatus = member.status === 'Active' ? 'Inactive' : 'Active';
    const msg = nextStatus === 'Inactive'
      ? `Deactivate ${member.fullName}? Historical records will be retained.`
      : `Reactivate ${member.fullName}?`;

    if (!window.confirm(msg)) return;

    try {
      await api.setTeamMemberStatus(member.id, nextStatus);
      showToast(`${member.fullName} marked as ${nextStatus}`, 'success');
      await refreshMembers();
      await fetchTeam();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleViewTasks = async (member: TeamMember) => {
    try {
      const tasks = await api.getTeamMembers();
      const allTasks = await api.getTasks();
      const memberTasks = allTasks.filter((t) => t.assigneeIds.includes(member.id));
      setSelectedMemberTasks({ member, tasks: memberTasks });
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch tasks', 'error');
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.fullName.toLowerCase().includes(q);
        const matchCode = m.employeeCode.toLowerCase().includes(q);
        const matchEmail = m.email.toLowerCase().includes(q);
        const matchDesig = m.designation.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchEmail && !matchDesig) return false;
      }
      if (departmentFilter !== 'all' && m.department !== departmentFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      return true;
    });
  }, [members, searchQuery, departmentFilter, statusFilter]);

  const departments = useMemo(() => Array.from(new Set(members.map((m) => m.department).filter(Boolean))), [members]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Team Members Directory</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              {filteredMembers.length} staff
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage staff profiles, employee codes, departments, and workload history
          </p>
        </div>

        <button
          onClick={() => setShowMemberModal(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Team Member</span>
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
            placeholder="Search staff by name, code, or email..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive / Deactivated</option>
        </select>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            No team members found matching your search.
          </div>
        ) : (
          filteredMembers.map((m) => (
            <div
              key={m.id}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs space-y-4 transition-all ${
                m.status === 'Inactive'
                  ? 'border-slate-200 dark:border-slate-800 opacity-60'
                  : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              {/* Member card top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt={m.fullName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-bold text-sm flex items-center justify-center">
                      {m.fullName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{m.fullName}</span>
                      <span className="font-mono text-[10px] text-slate-400 font-normal">
                        ({m.employeeCode})
                      </span>
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      {m.designation}
                    </div>
                    <div className="text-[11px] text-slate-400">{m.department}</div>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    m.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {m.status}
                </span>
              </div>

              {/* Contact metadata */}
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{m.email}</span>
                </div>
                {m.phone && (
                  <div className="flex items-center gap-2 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{m.phone}</span>
                  </div>
                )}
              </div>

              {/* Performance Stats row */}
              <div className="grid grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center text-xs">
                <div>
                  <div className="text-[10px] uppercase text-slate-400">Tasks</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {m.stats?.totalAssigned ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">Done</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    {m.stats?.completed ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">Overdue</div>
                  <div className="font-bold text-rose-600 dark:text-rose-400">
                    {m.stats?.overdue ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">Missed</div>
                  <div className="font-bold text-rose-600 dark:text-rose-400">
                    {m.stats?.missedCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Completion rate progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Completion Rate</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{m.stats?.completionRate ?? 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all"
                    style={{ width: `${m.stats?.completionRate ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  onClick={() => handleViewTasks(m)}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>View Workload</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingMember(m)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit profile"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(m)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      m.status === 'Active'
                        ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                        : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                    }`}
                  >
                    {m.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Member Tasks Workload Drawer */}
      {selectedMemberTasks && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {selectedMemberTasks.member.fullName} — Workload
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedMemberTasks.member.designation} • {selectedMemberTasks.tasks.length} assigned task(s)
                </p>
              </div>
              <button
                onClick={() => setSelectedMemberTasks(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedMemberTasks.tasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No tasks currently assigned.</div>
              ) : (
                selectedMemberTasks.tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 cursor-pointer space-y-2 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">{t.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : t.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Target: {t.currentTargetDate}</span>
                      <span>Progress: {t.progress}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MemberModal
        member={editingMember}
        isOpen={showMemberModal || !!editingMember}
        onClose={() => {
          setShowMemberModal(false);
          setEditingMember(null);
        }}
        onSuccess={() => {
          refreshMembers();
          fetchTeam();
        }}
      />

      <TaskDetailsDrawer
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onRefresh={() => fetchTeam()}
      />
    </div>
  );
};
