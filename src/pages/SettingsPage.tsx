import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  Database,
  Sparkles,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Save,
  Clock,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { api, Settings, BackupData } from '../services/api';
import { useApp } from '../context/AppContext';

export const SettingsPage: React.FC = () => {
  const { settings, refreshSettings, refreshMembers, showToast } = useApp();

  const [orgName, setOrgName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [reminderLeadDays, setReminderLeadDays] = useState(3);
  const [savingSettings, setSavingSettings] = useState(false);

  // Backup restore state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    summary?: any;
    data?: BackupData;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // System stats
  const [storageInfo, setStorageInfo] = useState<{ status: string; uptime: number; timezone: string } | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (settings) {
      setOrgName(settings.organizationName);
      setTimezone(settings.timezone);
      setReminderLeadDays(settings.defaultReminderLeadDays);
    }
    api.getHealth().then(setStorageInfo).catch(() => {});
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSettings({
        organizationName: orgName.trim(),
        timezone,
        defaultReminderLeadDays: Number(reminderLeadDays),
      });
      await refreshSettings();
      showToast('Organization settings updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      showToast('Generating authoritative JSON backup...', 'info');
      const backup = await api.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teamtrack-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('JSON backup downloaded successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export backup', 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setValidationResult(null);
    setValidating(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const res = await api.validateBackup(parsed);
        setValidationResult({
          valid: res.valid,
          errors: res.errors,
          summary: res.summary,
          data: parsed,
        });
      } catch (err: any) {
        setValidationResult({
          valid: false,
          errors: [`Invalid JSON file format: ${err.message}`],
        });
      } finally {
        setValidating(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!validationResult?.data) return;

    if (!window.confirm('CRITICAL CONFIRMATION: Restoring will safely create a timestamped pre-restore safety backup and replace current records with this backup. Proceed?')) {
      return;
    }

    setRestoring(true);
    try {
      const res = await api.restoreBackup(validationResult.data);
      showToast(res.message, 'success');
      setUploadFile(null);
      setValidationResult(null);
      await refreshMembers();
      await refreshSettings();
    } catch (err: any) {
      showToast(err.message || 'Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleLoadSample = async () => {
    if (!window.confirm('Load 15 demonstration tasks, 5 staff members, and 4 goals into workspace?')) return;
    setLoadingSample(true);
    try {
      await api.loadSampleData();
      showToast('Sample demonstration records loaded successfully', 'success');
      await refreshMembers();
      await refreshSettings();
    } catch (err: any) {
      showToast(err.message || 'Failed to load sample data', 'error');
    } finally {
      setLoadingSample(false);
    }
  };

  const handleClearAll = async () => {
    const prompt1 = window.confirm('DANGER: Are you sure you want to completely clear all tasks, members, goals, and history?');
    if (!prompt1) return;
    const prompt2 = window.prompt('Type CLEAR to confirm complete reset:');
    if (prompt2 !== 'CLEAR') {
      showToast('Reset cancelled. Confirmation text did not match.', 'info');
      return;
    }

    setClearing(true);
    try {
      await api.clearData();
      showToast('All application records cleared.', 'success');
      await refreshMembers();
      await refreshSettings();
    } catch (err: any) {
      showToast(err.message || 'Clear failed', 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>System Settings & Data Operations</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Organization metadata, timezone rules, persistent server-side JSON backup & restore
        </p>
      </div>

      {/* 1. Organization & Engine Settings */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Organization Configuration</h2>
            <p className="text-xs text-slate-400">Define tenant branding and server scheduling timezones</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Organization / Company Name
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="MR Technologies"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Timezone (Used for date comparisons & deadline checks)
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST - Default)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Reminder Lead Days
              </label>
              <select
                value={reminderLeadDays}
                onChange={(e) => setReminderLeadDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value={1}>1 Day Before Deadline</option>
                <option value={3}>3 Days Before Deadline (Default)</option>
                <option value={7}>7 Days (1 Week) Before Deadline</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Server Status & Storage Engine
              </label>
              <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Atomic Server JSON FS Engine</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">● Operational</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. JSON File Storage Backup & Safe Restore (Section 12 & 13) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Server-Side JSON Backup & Restore</h2>
            <p className="text-xs text-slate-400">
              Download complete authoritative workspace state or restore from validated JSON bundle
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-500" />
              <span>Export Authoritative JSON Backup</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Generates a full snapshot containing team-members.json, tasks.json, goals.json, deadline-history.json, missed-deadlines.json, comments, and activity logs.
            </p>
            <button
              onClick={handleExportBackup}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup File (.json)</span>
            </button>
          </div>

          {/* Import / Restore Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-purple-500" />
              <span>Restore Workspace from Backup</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload a valid TeamTrack backup file. The system will pre-validate schema version and record integrity, then take an automatic safety pre-restore backup.
            </p>

            <label className="w-full py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-purple-500/20">
              <Upload className="w-4 h-4" />
              <span>{uploadFile ? uploadFile.name : 'Select Backup File (.json)'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Validation Preview and Confirmation Box */}
        {validating && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-xs text-blue-700 dark:text-blue-300">
            Validating backup schema version, integrity, and references...
          </div>
        )}

        {validationResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-3 ${
              validationResult.valid
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                : 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
            }`}
          >
            {validationResult.valid ? (
              <>
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Backup Validation Passed — Ready to Restore</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60">
                    <span className="text-[10px] uppercase text-slate-400 block">Members</span>
                    <strong className="text-sm">{validationResult.summary?.membersCount}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60">
                    <span className="text-[10px] uppercase text-slate-400 block">Tasks</span>
                    <strong className="text-sm">{validationResult.summary?.tasksCount}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60">
                    <span className="text-[10px] uppercase text-slate-400 block">Goals</span>
                    <strong className="text-sm">{validationResult.summary?.goalsCount}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60">
                    <span className="text-[10px] uppercase text-slate-400 block">Revisions</span>
                    <strong className="text-sm">{validationResult.summary?.deadlineHistoryCount}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60">
                    <span className="text-[10px] uppercase text-slate-400 block">Missed Deadlines</span>
                    <strong className="text-sm">{validationResult.summary?.missedDeadlinesCount}</strong>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleConfirmRestore}
                    disabled={restoring}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                  >
                    {restoring ? 'Restoring atomic files...' : 'Apply & Restore Backup'}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-1 text-rose-700 dark:text-rose-300">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Backup Validation Failed</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Demonstration & Data Maintenance (Section 18) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Workspace Data Tools</h2>
            <p className="text-xs text-slate-400">Load sample demonstration dataset or perform factory workspace reset</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-xs text-slate-900 dark:text-white">Seed Sample Data</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loads 5 realistic staff members (QA, Dev, DevOps, Architect), 15 tasks across statuses, 4 goals, and historical deadline events.
            </p>
            <button
              onClick={handleLoadSample}
              disabled={loadingSample}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {loadingSample ? 'Loading...' : 'Load Sample Data'}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-2">
            <div className="font-bold text-xs text-rose-800 dark:text-rose-300">Clear All Workspace Records</div>
            <p className="text-xs text-rose-600 dark:text-rose-400">
              Permanently purges tasks, team members, goals, and history from the server JSON files.
            </p>
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear All Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
