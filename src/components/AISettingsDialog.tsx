import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles, Shield, Search, HelpCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAI } from "@/contexts/AIContext";
import { AIConfig, AIProviderType, callAI, loadAIConfig } from "@/lib/ai";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Model lists for each provider (verified correct IDs)
const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro"
];

const GEMMA_MODELS = [
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
  "gemma-3-27b-it"
];

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "groq/compound",
  "groq/compound-mini",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b"
];

const MISTRAL_MODELS = [
  "mistral-large-latest",
  "mistral-small-latest",
  "open-mistral-7b",
  "open-mixtral-8x7b",
  "open-mixtral-8x22b",
];

const CLAUDE_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
];

const OPENAI_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
];

// Provider info with API key links and descriptions
const PROVIDER_INFO = {
  gemini: {
    name: "Google Gemini",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    description: "Free tier available with generous limits. Native Google Search support.",
  },
  groq: {
    name: "Groq",
    apiKeyUrl: "https://console.groq.com/keys",
    description: "Ultra-fast inference with free tier. Native web search on compound models.",
  },
  mistral: {
    name: "Mistral AI",
    apiKeyUrl: "https://console.mistral.ai/api-keys",
    description: "European AI provider with native web search support.",
  },
  claude: {
    name: "Anthropic Claude",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    description: "Advanced reasoning capabilities with native web search.",
  },
  openai: {
    name: "OpenAI",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    description: "Industry-leading models. Uses Brave Search for web search.",
  },
  "openai-compat": {
    name: "OpenAI-Compatible",
    apiKeyUrl: null,
    description: "Works with Ollama, LM Studio, and other compatible endpoints.",
  },
};

export function AISettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { config, updateConfig, removeConfig, refreshConfig } = useAI();

  const [providerType, setProviderType] = useState<AIProviderType>(
    config?.type ?? "gemini"
  );
  const [apiKey, setApiKey] = useState(
    config?.type && config.type !== "openai-compat" ? config.apiKey : ""
  );
  const [model, setModel] = useState(() => {
    if (!config) return "gemini-3.1-flash-lite";
    if (config.type === "openai-compat") return config.modelId;
    return config.model;
  });
  const [customModel, setCustomModel] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [baseUrl, setBaseUrl] = useState(
    config?.type === "openai-compat" ? config.baseUrl : "https://api.openai.com"
  );
  const [enableSearch, setEnableSearch] = useState(config?.enableSearch ?? false);
  const [braveSearchApiKey, setBraveSearchApiKey] = useState("");

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load Brave Search API key separately
  useEffect(() => {
    const loadBraveKey = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai/brave-search`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.api_key) {
            setBraveSearchApiKey(data.api_key);
          }
        }
      } catch (error) {
        console.error('Error loading Brave Search key:', error);
      }
    };

    if (open) {
      loadBraveKey();
    }
  }, [open]);

  const handleProviderChange = async (newProvider: AIProviderType) => {
    setProviderType(newProvider);
    setUseCustomModel(false);
    setCustomModel("");
    
    try {
      const savedConfig = await loadAIConfig(newProvider);
      if (savedConfig) {
        if (savedConfig.type !== "openai-compat") {
          setApiKey(savedConfig.apiKey || "");
          setModel(savedConfig.model || "");
        } else {
          setApiKey(savedConfig.apiKey || "");
          setBaseUrl(savedConfig.baseUrl || "https://api.openai.com");
          setModel(savedConfig.modelId || "");
        }
        setEnableSearch(savedConfig.enableSearch || false);
        return; // Skip setting defaults if we have a saved config
      }
    } catch (e) {
      console.error('Failed to load specific provider config:', e);
    }

    setApiKey(""); // Clear key if no saved config found
    // Set default model for each provider
    switch (newProvider) {
      case "gemini":
        setModel("gemini-3.1-flash-lite");
        break;
      case "groq":
        setModel("llama-3.3-70b-versatile");
        break;
      case "mistral":
        setModel("mistral-large-latest");
        break;
      case "claude":
        setModel("claude-3-5-sonnet-20241022");
        break;
      case "openai":
        setModel("gpt-4o-mini");
        break;
      case "openai-compat":
        setModel("");
        break;
    }
  };

  const buildConfig = (): AIConfig => {
    const trimmedKey = apiKey.trim();
    const finalModel = useCustomModel ? customModel.trim() : model.trim();

    switch (providerType) {
      case "gemini":
        return { type: "gemini", apiKey: trimmedKey, model: finalModel, enableSearch };
      case "groq":
        return { type: "groq", apiKey: trimmedKey, model: finalModel, enableSearch };
      case "mistral":
        return { type: "mistral", apiKey: trimmedKey, model: finalModel, enableSearch };
      case "claude":
        return { type: "claude", apiKey: trimmedKey, model: finalModel, enableSearch };
      case "openai":
        return { type: "openai", apiKey: trimmedKey, model: finalModel, enableSearch };
      case "openai-compat":
        return { 
          type: "openai-compat", 
          baseUrl: baseUrl.trim(), 
          apiKey: trimmedKey, 
          modelId: finalModel, 
          enableSearch,
          braveSearchApiKey: braveSearchApiKey.trim() || undefined,
        };
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const cfg = buildConfig();
      const result = await callAI(cfg, "You are a test assistant.", "Say hello in one word.");
      toast.success(`Connection OK — AI said: "${result.trim().slice(0, 30)}"`);
    } catch (e: any) {
      toast.error(e.message || "Connection failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    // Validate that API key is provided
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      toast.error("Please enter an API key");
      return;
    }

    setSaving(true);
    try {
      await updateConfig(buildConfig());
      
      // Save or delete Brave Search API key separately
      const token = localStorage.getItem('auth_token');
      if (token) {
        if (braveSearchApiKey.trim()) {
          // Save Brave Search API key
          await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai/brave-search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ api_key: braveSearchApiKey.trim() }),
          });
        } else {
          // Delete Brave Search API key if empty
          await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai/brave-search`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        }
      }
      
      await refreshConfig();
      toast.success("AI settings saved!");
      onOpenChange(false);
    } catch (e: any) {
      console.error('Save AI config error:', e);
      toast.error(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    try {
      // Delete AI config from database
      await removeConfig();
      
      // Also delete Brave Search API key
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai/brave-search`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
      
      // Clear local state
      setApiKey("");
      setBraveSearchApiKey("");
      setEnableSearch(false);
      
      toast.success("AI disabled and all keys removed");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to disable AI");
    }
  };

  // Get search description based on provider
  const getSearchDescription = () => {
    if (braveSearchApiKey.trim()) {
      return "Uses Brave Search (overrides native search)";
    }
    switch (providerType) {
      case "gemini":
        return "Uses Google Search (native)";
      case "groq":
        return "Only compound & compound-mini models have built-in web search";
      case "mistral":
        return "Uses Mistral web search (native)";
      case "claude":
        return "Uses Claude web search (native)";
      case "openai":
        return "Uses native web search";
      case "openai-compat":
        return "Requires Brave Search API key below";
    }
  };

  const providerInfo = PROVIDER_INFO[providerType];

  return (
    <TooltipProvider delayDuration={300}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl sm:max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl text-secondary">
              <Sparkles className="w-5 h-5 text-primary" /> AI Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Provider selector */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>AI Provider</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex">
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">{providerInfo.description}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={providerType}
                onValueChange={(v) => handleProviderChange(v as AIProviderType)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                  <SelectItem value="mistral">Mistral AI</SelectItem>
                  <SelectItem value="claude">Anthropic Claude</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="openai-compat">OpenAI-Compatible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Base URL (only for OpenAI-compatible) */}
            {providerType === "openai-compat" && (
              <div className="space-y-1.5">
                <Label htmlFor="base-url">API Endpoint URL</Label>
                <Input
                  id="base-url"
                  placeholder="https://api.example.com/v1/chat/completions"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="rounded-xl font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full endpoint URL (e.g. http://localhost:11434/v1/chat/completions)
                </p>
              </div>
            )}

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="api-key">API Key</Label>
                {providerInfo.apiKeyUrl && (
                  <a
                    href={providerInfo.apiKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Get API Key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <Input
                id="api-key"
                type="password"
                placeholder={providerType === "gemini" ? "AIza…" : "sk-…"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="rounded-xl font-mono text-sm"
              />
            </div>

            {/* Model selector */}
            <div className="space-y-1.5">
              <Label>Model</Label>
              
              {/* Custom model toggle */}
              <div className="flex items-center gap-2 mb-2">
                <Switch
                  id="custom-model"
                  checked={useCustomModel}
                  onCheckedChange={setUseCustomModel}
                />
                <Label htmlFor="custom-model" className="text-sm cursor-pointer">
                  Use custom model ID
                </Label>
              </div>

              {useCustomModel ? (
                <Input
                  placeholder="Enter custom model ID"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="rounded-xl font-mono text-sm"
                />
              ) : providerType === "openai-compat" ? (
                <Input
                  placeholder="gpt-4o-mini or llama3.2"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="rounded-xl font-mono text-sm"
                />
              ) : (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerType === "gemini" && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Gemini Models</div>
                        {GEMINI_MODELS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Gemma Models (Open)</div>
                        {GEMMA_MODELS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </>
                    )}
                    {providerType === "groq" && GROQ_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                    {providerType === "mistral" && MISTRAL_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                    {providerType === "claude" && CLAUDE_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                    {providerType === "openai" && OPENAI_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {providerType === "gemini" && !useCustomModel && (
                <p className="text-xs text-muted-foreground">
                  All models are free to use with the Gemini API
                </p>
              )}
              {providerType === "groq" && !useCustomModel && (
                <p className="text-xs text-muted-foreground">
                  Compound models have native web search. Other models use Brave Search fallback.
                </p>
              )}
            </div>

            {/* Web Search Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/60">
              <div className="flex items-start gap-3">
                <Search className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="enable-search" className="text-sm font-medium cursor-pointer">
                    Enable Web Search
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {getSearchDescription()}
                  </p>
                </div>
              </div>
              <Switch
                id="enable-search"
                checked={enableSearch}
                onCheckedChange={setEnableSearch}
              />
            </div>

            {/* Brave Search API Key (always show, stored separately) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="brave-api-key">Brave Search API Key (Optional)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex">
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-sm">
                        Free tier: 2000 queries/month. Used for web search with OpenAI-compatible providers. 
                        Get your API key at brave.com/search/api/
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <a
                  href="https://brave.com/search/api/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Get API Key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <Input
                id="brave-api-key"
                type="password"
                placeholder="BSA..."
                value={braveSearchApiKey}
                onChange={(e) => setBraveSearchApiKey(e.target.value)}
                className="rounded-xl font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Stored separately and shared across all providers
              </p>
            </div>

            {/* Privacy note */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              All API keys are encrypted and stored securely in the database. You can save multiple providers with different keys.
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTest} disabled={testing} className="rounded-xl">
                  {testing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Test
                </Button>
                {config && (
                  <Button variant="ghost" onClick={handleDisable} className="rounded-xl text-destructive hover:text-destructive">
                    Disable AI
                  </Button>
                )}
              </div>
              <Button onClick={handleSave} disabled={saving} className="rounded-xl gradient-primary text-primary-foreground">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
