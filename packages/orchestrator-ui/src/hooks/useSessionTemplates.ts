import { useState, useEffect, useCallback } from 'react';

export interface SessionTemplate {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lastUsed?: string;
}

const STORAGE_KEY = 'orchestrator-session-templates';

function loadTemplates(): SessionTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
  return [];
}

function saveTemplates(templates: SessionTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save templates:', err);
  }
}

export function useSessionTemplates() {
  const [templates, setTemplates] = useState<SessionTemplate[]>(loadTemplates);

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  const addTemplate = useCallback((name: string, path: string) => {
    const newTemplate: SessionTemplate = {
      id: crypto.randomUUID(),
      name,
      path,
      createdAt: new Date().toISOString(),
    };
    setTemplates(prev => [...prev, newTemplate]);
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<SessionTemplate>) => {
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ));
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  const recordUsage = useCallback((id: string) => {
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, lastUsed: new Date().toISOString() } : t
    ));
  }, []);

  return {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    recordUsage,
  };
}
