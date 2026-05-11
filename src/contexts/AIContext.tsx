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
    try {
      const loadedConfig = await loadAIConfig();
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load AI config:', error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const updateConfig = useCallback(async (c: AIConfig) => {
    await saveAIConfig(c);
    setConfig(c);
  }, []);

  const removeConfig = useCallback(async () => {
    await clearAIConfig();
    setConfig(null);
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
