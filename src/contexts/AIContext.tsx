import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { AIConfig, loadAIConfig, saveAIConfig, clearAIConfig } from "@/lib/ai";

interface AIContextValue {
  config: AIConfig | null;
  isConfigured: boolean;
  loading: boolean;
  updateConfig: (config: AIConfig) => Promise<void>;
  removeConfig: () => Promise<void>;
  refreshConfig: () => Promise<void>;
}

const AIContext = createContext<AIContextValue | null>(null);

export function AIProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshConfig = useCallback(async () => {
    setLoading(true);
    console.log('[AIContext] Refreshing AI config from database...');
    try {
      const loadedConfig = await loadAIConfig();
      console.log('[AIContext] AI config loaded:', loadedConfig ? `${loadedConfig.type} configured` : 'not found');
      setConfig(loadedConfig);
    } catch (error) {
      console.error('[AIContext] Failed to load AI config:', error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load config on mount and when auth token changes
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    console.log('[AIContext] Mount effect - auth token:', token ? 'present' : 'missing');
    if (token) {
      refreshConfig();
    } else {
      setConfig(null);
      setLoading(false);
    }
  }, [refreshConfig]);

  // Listen for storage events (sign in/out in other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        if (e.newValue) {
          console.log('[AIContext] Auth token added in another tab, refreshing config');
          refreshConfig();
        } else {
          console.log('[AIContext] Auth token removed in another tab, clearing config');
          setConfig(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshConfig]);

  const updateConfig = useCallback(async (c: AIConfig) => {
    console.log('[AIContext] Updating config in database');
    await saveAIConfig(c);
    // Immediately update local state (optimistic update)
    setConfig(c);
    console.log('[AIContext] Config updated, cache cleared');
  }, []);

  const removeConfig = useCallback(async () => {
    console.log('[AIContext] Removing config from database');
    await clearAIConfig();
    // Immediately clear local state
    setConfig(null);
    console.log('[AIContext] Config removed, cache cleared');
  }, []);

  return (
    <AIContext.Provider value={{ config, isConfigured: config !== null, loading, updateConfig, removeConfig, refreshConfig }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAI must be used inside AIProvider");
  return ctx;
}
