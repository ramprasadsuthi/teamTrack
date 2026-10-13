import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export const ReportsPage: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'performance' | 'missed' | 'overdue'>('performance');
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [missedData, setMissedData] = useState<any[]>([]);
  const [overdueData, setOverdueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getTeamPerformanceReport(),
      api.getMissedDeadlinesReport(),
      api.getOverdueTasksReport(),
    ])
      .then(([perf, missed, overdue]) => {
        setPerformanceData(perf.data || []);
        setMissedData(missed || []);
        setOverdueData(overdue || []);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadCsv = (type: 'tasks' | 'performance') => {
    window.location.href = `/api/v1/reports/export.csv?type=${type}`;
    showToast(`Downloading ${type} report CSV...`, 'info');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Audit & Analytical Reports</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Team performance evaluations, deadline compliance logs, and CSV exports
          </p>
        </div>

        {/* CSV Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadCsv('tasks')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Tasks CSV</span>
          </button>
          <button
            onClick={() => handleDownloadCsv('performance')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Performance CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('performance')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'performance'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Performance Audit ({performanceData.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('missed')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'missed'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Missed Targets Log ({missedData.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'overdue'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Active Overdue Tasks ({overdueData.length})</span>
        </button>
      </div>

      {/* Tab 1: Staff Performance Table */}
      {activeTab === 'performance' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Total Assigned</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-center">In Progress</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-4 text-center">Missed Targets</th>
                  <th className="py-3 px-4">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {performanceData.map((row) => (
                  <tr key={row.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{row.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.code} • {row.designation}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{row.department}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                      {row.totalTasks}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.completed}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-blue-600 dark:text-blue-400">
                      {row.inProgress}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-rose-600 dark:text-rose-400">
                      {row.overdue}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-rose-600 dark:text-rose-400">
                      {row.missedDeadlines}
                    </td>
                    <td className="py-3 px-4 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${row.completionRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] w-9 text-right">
                          {row.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Recorded Missed Deadlines Log */}
      {activeTab === 'missed' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Assignees</th>
                  <th className="py-3 px-4">Target Date Missed</th>
                  <th className="py-3 px-4">Detection Timestamp</th>
                  <th className="py-3 px-4">Current Task Target</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {missedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No missed deadlines recorded.
                    </td>
                  </tr>
                ) : (
                  missedData.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{ev.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                        {ev.taskTitle}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{ev.assignees || 'Unassigned'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                        {ev.targetDateMissed}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(ev.detectedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                        {ev.currentTaskTargetDate}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {ev.currentTaskStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Active Overdue Tasks */}
      {activeTab === 'overdue' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Assignees</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Original Target</th>
                  <th className="py-3 px-4">Current Target</th>
                  <th className="py-3 px-4 text-center">Days Overdue</th>
                  <th className="py-3 px-4 text-center">Missed Targets</th>
                  <th className="py-3 px-4">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overdueData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No overdue tasks currently found.
                    </td>
                  </tr>
                ) : (
                  overdueData.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                        {t.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{t.assignees || 'Unassigned'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{t.originalTargetDate}</td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-600">{t.currentTargetDate}</td>
                      <td className="py-3 px-4 text-center font-bold text-rose-600">{t.daysOverdue}d</td>
                      <td className="py-3 px-4 text-center font-bold text-rose-600">{t.missedDeadlineCount}</td>
                      <td className="py-3 px-4">{t.progress}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
