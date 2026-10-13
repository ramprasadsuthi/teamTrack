import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, TeamMember, Settings, Notification } from '../services/api';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  members: TeamMember[];
  membersMap: Map<string, TeamMember>;
  refreshMembers: () => Promise<void>;
  notifications: Notification[];
  unreadNotifCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  settings: Settings | null;
  refreshSettings: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  triggerDeadlineCheck: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('teamtrack_theme') as 'light' | 'dark') || 'light';
  });

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Apply dark mode class to html document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('teamtrack_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshMembers = useCallback(async () => {
    try {
      const data = await api.getTeamMembers();
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      showToast('Failed to mark notification as read', 'error');
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const triggerDeadlineCheck = async () => {
    try {
      const res = await api.checkDeadlines();
      await refreshNotifications();
      if (res.result?.newMissedCount > 0) {
        showToast(`Detected ${res.result.newMissedCount} newly missed deadlines.`, 'warning');
      } else {
        showToast('Deadline monitor executed. All tasks up to date.', 'info');
      }
    } catch (err) {
      showToast('Error running deadline check', 'error');
    }
  };

  useEffect(() => {
    refreshMembers();
    refreshNotifications();
    refreshSettings();

    // Periodic notification poll every 45s
    const pollInterval = setInterval(() => {
      refreshNotifications();
    }, 45000);
    return () => clearInterval(pollInterval);
  }, [refreshMembers, refreshNotifications, refreshSettings]);

  const membersMap = new Map(members.map((m) => [m.id, m]));
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        members,
        membersMap,
        refreshMembers,
        notifications,
        unreadNotifCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        settings,
        refreshSettings,
        toasts,
        showToast,
        removeToast,
        triggerDeadlineCheck,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
