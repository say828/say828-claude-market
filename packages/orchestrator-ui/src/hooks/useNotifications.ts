import { useState, useCallback, useEffect, useRef } from 'react';
import type { HookAlert, NotificationSettings } from '@claude-orchestrator/shared';
import {
  MAX_NOTIFICATIONS,
  AUTO_DELETE_INTERVAL_MS,
  NOTIFICATION_SOUNDS,
  STORAGE_KEYS,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@claude-orchestrator/shared';

interface UseNotificationsReturn {
  notifications: HookAlert[];
  settings: NotificationSettings;
  addNotification: (alert: HookAlert) => void;
  dismissNotification: (index: number) => void;
  clearAllNotifications: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  playSound: () => void;
  showBrowserNotification: (alert: HookAlert) => void;
  requestBrowserPermission: () => Promise<boolean>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<HookAlert[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.notificationSettings);
    if (saved) {
      try {
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) };
      } catch {
        // ignore
      }
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  });

  const audioContextRef = useRef<AudioContext | null>(null);

  // Auto-delete old notifications
  useEffect(() => {
    if (settings.autoDeleteMinutes <= 0) return;

    const interval = setInterval(() => {
      const cutoff = Date.now() - settings.autoDeleteMinutes * 60 * 1000;
      setNotifications((prev) => prev.filter((n) => (n.receivedAt ?? 0) > cutoff));
    }, AUTO_DELETE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [settings.autoDeleteMinutes]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notificationSettings, JSON.stringify(settings));
  }, [settings]);

  const addNotification = useCallback((alert: HookAlert) => {
    setNotifications((prev) => [alert, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const dismissNotification = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const playSound = useCallback(() => {
    if (!settings.soundEnabled || settings.soundType === 'none') return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      const playTone = (freq: number, duration: number, delay: number, volume: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration);
        oscillator.start(ctx.currentTime + delay);
        oscillator.stop(ctx.currentTime + delay + duration);
      };

      const sounds = NOTIFICATION_SOUNDS[settings.soundType as keyof typeof NOTIFICATION_SOUNDS];
      if (sounds) {
        for (const tone of sounds) {
          playTone(tone.freq, tone.duration, tone.delay, tone.volume);
        }
      }
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  }, [settings.soundEnabled, settings.soundType]);

  const showBrowserNotification = useCallback(
    (alert: HookAlert) => {
      if (!settings.browserNotifications) return;
      if (Notification.permission !== 'granted') return;

      const icon =
        alert.hook.type === 'bash'
          ? '💻'
          : alert.hook.type === 'edit'
          ? '📝'
          : alert.hook.type === 'plan'
          ? '📋'
          : '❓';

      new Notification(`${icon} ${alert.hook.toolName}`, {
        body: `${alert.sessionName}: ${alert.hook.preview || 'Action required'}`,
        tag: alert.hook.toolUseId,
        requireInteraction: true,
      });
    },
    [settings.browserNotifications]
  );

  const requestBrowserPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  return {
    notifications,
    settings,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    updateSettings,
    playSound,
    showBrowserNotification,
    requestBrowserPermission,
  };
}
