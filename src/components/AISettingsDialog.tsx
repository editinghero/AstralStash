import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAI } from "@/contexts/AIContext";
import { AIConfig, callAI } from "@/lib/ai";

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

export function AISettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { config, updateConfig, removeConfig } = useAI();

  const [providerType, setProviderType] = useState<"gemini" | "openai-compat">(
    config?.type ?? "gemini"
  );
  // Gemini fields
  const [geminiKey, setGeminiKey] = useState(config?.type === "gemini" ? config.apiKey : "");
  const [geminiModel, setGeminiModel] = useState(
    config?.type === "gemini" ? config.model : "gemini-3.1-flash-lite"
  );
  // OpenAI-compat fields
  const [baseUrl, setBaseUrl] = useState(
    config?.type === "openai-compat" ? config.baseUrl : "https://api.openai.com"
  );
  const [oaiKey, setOaiKey] = useState(config?.type === "openai-compat" ? config.apiKey : "");
  const [modelId, setModelId] = useState(config?.type === "openai-compat" ? config.modelId : "");

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const buildConfig = (): AIConfig => {
    if (providerType === "gemini") {
      return { type: "gemini", apiKey: geminiKey.trim(), model: geminiModel };
    }
    return { type: "openai-compat", baseUrl: baseUrl.trim(), apiKey: oaiKey.trim(), modelId: modelId.trim() };
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
    setSaving(true);
    try {
      await updateConfig(buildConfig());
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
      await removeConfig();
      toast.success("AI disabled");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to disable AI");
    }
  };

  return (
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
            <Label>AI Provider</Label>
            <Select
              value={providerType}
              onValueChange={(v) => setProviderType(v as "gemini" | "openai-compat")}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="openai-compat">OpenAI-Compatible (OpenAI, Groq, Ollama…)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gemini fields */}
          {providerType === "gemini" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="gemini-key">API Key</Label>
                <Input
                  id="gemini-key"
                  type="password"
                  placeholder="AIza…"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="rounded-xl font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Get yours at{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-foreground"
                  >
                    aistudio.google.com/apikey
                  </a>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Select value={geminiModel} onValueChange={setGeminiModel}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Gemini Models</div>
                    {GEMINI_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Gemma Models (Open)</div>
                    {GEMMA_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  All models are free to use with the Gemini API
                </p>
              </div>
            </>
          )}

          {/* OpenAI-compat fields */}
          {providerType === "openai-compat" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="oai-url">Base URL</Label>
                <Input
                  id="oai-url"
                  placeholder="https://api.openai.com"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="rounded-xl font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oai-key">API Key</Label>
                <Input
                  id="oai-key"
                  type="password"
                  placeholder="sk-…"
                  value={oaiKey}
                  onChange={(e) => setOaiKey(e.target.value)}
                  className="rounded-xl font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oai-model">Model ID</Label>
                <Input
                  id="oai-model"
                  placeholder="gpt-4o-mini"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="rounded-xl font-mono text-sm"
                />
              </div>
            </>
          )}

          {/* Privacy note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            Your API key is encrypted and stored securely in the database. It's never exposed to other users.
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
  );
}
