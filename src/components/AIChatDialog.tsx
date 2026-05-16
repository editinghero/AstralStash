import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Sparkles, Bot, Search, ChevronDown, Brain, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAI } from "@/contexts/AIContext";
import { chatWithItem, chatWithKnowledgeBase, AIConfig } from "@/lib/ai";
import { StashItem } from "@/lib/stash";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; text: string };

type Props =
  | { mode: "item"; item: StashItem; open: boolean; onOpenChange: (o: boolean) => void; onOpenAISettings: () => void }
  | { mode: "kb"; items: StashItem[]; open: boolean; onOpenChange: (o: boolean) => void; onOpenAISettings: () => void };

// Parse thinking blocks from AI response
// Supports multiple formats: <think>, <thinking>, and other common variations
function parseThinkBlocks(text: string): { thinking: string | null; content: string } {
  // Try multiple thinking tag formats used by different models
  const patterns = [
    /<think>([\s\S]*?)<\/think>/gi,           // Generic <think>
    /<thinking>([\s\S]*?)<\/thinking>/gi,     // Common <thinking>
    /<thought>([\s\S]*?)<\/thought>/gi,       // Alternative <thought>
    /<reasoning>([\s\S]*?)<\/reasoning>/gi,   // Alternative <reasoning>
  ];

  let thinking: string | null = null;
  let content = text;

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      // Collect all thinking blocks
      const thinkingParts = matches.map(m => m[1].trim());
      thinking = thinkingParts.join('\n\n');
      
      // Remove all thinking blocks from content
      content = text.replace(pattern, '').trim();
      break; // Stop after first matching pattern
    }
  }

  return { thinking, content };
}

// Collapsible think block component
function ThinkBlock({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-lg bg-muted/60 border border-border/40"
      >
        <Brain className="w-3 h-3" />
        <span>Thinking</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/30 text-xs text-muted-foreground leading-relaxed italic max-h-[200px] overflow-y-auto">
              {thinking}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Markdown renderer for assistant messages
function MarkdownMessage({ text }: { text: string }) {
  const { thinking, content } = parseThinkBlocks(text);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {thinking && <ThinkBlock thinking={thinking} />}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-gray-400 dark:border-gray-600">
              <table className="min-w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-400 dark:border-gray-600 last:border-0">{children}</tr>,
          th: ({ children }) => (
            <th className="px-2.5 py-1.5 text-left font-semibold border-b border-gray-400 dark:border-gray-600 border-r border-gray-400 dark:border-gray-600 last:border-r-0">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 border-r border-gray-400 dark:border-gray-600 last:border-r-0">{children}</td>
          ),
          // Style links
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 break-all">
              {children}
            </a>
          ),
          // Style images
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="max-w-full h-auto rounded-lg border border-border/40 my-2" />
          ),
          // Style code blocks
          code: ({ className, children, ...props }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <div className="my-2 rounded-lg overflow-x-auto bg-muted/80 border border-border/40">
                  <pre className="p-2.5 text-xs"><code className={className} {...props}>{children}</code></pre>
                </div>
              );
            }
            return (
              <code className="px-1 py-0.5 rounded bg-muted/80 text-xs font-mono" {...props}>{children}</code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          // Style paragraphs
          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          // Style lists
          ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          // Style headings
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0">{children}</h3>,
          // Style blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 my-1.5 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          // Style strong/bold
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          // Style em/italic
          em: ({ children }) => <em className="italic">{children}</em>,
          // Style strikethrough
          del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
          // Style hr
          hr: () => <hr className="my-2 border-border/40" />,
          // Style task list checkboxes
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input 
                  type="checkbox" 
                  checked={checked} 
                  disabled 
                  className="mr-1.5 align-middle cursor-not-allowed" 
                  {...props} 
                />
              );
            }
            return <input type={type} {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      <button
        onClick={handleCopy}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-background/80 hover:bg-accent border border-border/40"
        title="Copy response"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function AIChatDialog(props: Props) {
  const { config, isConfigured, updateConfig } = useAI();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [braveKeyConfigured, setBraveKeyConfigured] = useState(false);
  const [braveSearchApiKey, setBraveSearchApiKey] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatKey = props.mode === "item" ? `chat_history_${props.item.id}` : `chat_history_kb`;

  // Load Brave Search API key status
  useEffect(() => {
    if (!props.open) return;
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
            setBraveKeyConfigured(true);
            setBraveSearchApiKey(data.api_key);
          } else {
            setBraveKeyConfigured(false);
            setBraveSearchApiKey("");
          }
        } else {
          setBraveKeyConfigured(false);
          setBraveSearchApiKey("");
        }
      } catch {
        setBraveKeyConfigured(false);
        setBraveSearchApiKey("");
      }
    };
    loadBraveKey();
  }, [props.open]);

  useEffect(() => {
    if (props.open) {
      const saved = localStorage.getItem(chatKey);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
      setInput("");
    }
  }, [props.open, chatKey]);

  useEffect(() => {
    if (props.open) {
      setEnableSearch(config?.enableSearch ?? false);
    }
  }, [props.open, config?.enableSearch]);

  useEffect(() => {
    if (props.open && messages.length > 0) {
      localStorage.setItem(chatKey, JSON.stringify(messages));
    } else if (props.open && messages.length === 0) {
      localStorage.removeItem(chatKey);
    }
  }, [messages, chatKey, props.open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const title =
    props.mode === "item"
      ? `Chat with "${props.item.title.slice(0, 40)}"`
      : "Chat with Knowledge Base";

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    if (!isConfigured || !config) {
      props.onOpenAISettings();
      return;
    }

    const next: Message[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      let answer: string;
      const history = messages.map((m) => ({ role: m.role, text: m.text }));

      // Create config with current search setting
      // If Brave Search is configured, inject it and use Brave for all providers
      const chatConfig: AIConfig = {
        ...config,
        enableSearch: enableSearch,
        ...(braveKeyConfigured && braveSearchApiKey ? { braveSearchApiKey } : {}),
      } as AIConfig;

      if (props.mode === "item") {
        answer = await chatWithItem(chatConfig, props.item, history, q);
      } else {
        const live = props.items.filter((i) => !i.deleted);
        answer = await chatWithKnowledgeBase(chatConfig, live, history, q);
      }

      setMessages([...next, { role: "assistant", text: answer }]);
    } catch (e: any) {
      toast.error(e.message || "AI error");
    } finally {
      setLoading(false);
    }
  };

  // Get search description — returns null if web search is not available for this config
  const getSearchDescription = (): string | null => {
    if (!config) return null;
    // If Brave Search API key is configured, always use Brave for all providers
    if (braveKeyConfigured) {
      return "Brave Search";
    }
    switch (config.type) {
      case "gemini":
        return "Google Search";
      case "groq": {
        const model = config.model || "";
        if (model.startsWith("groq/compound")) {
          return "Built-in Search";
        }
        // Non-compound Groq models don't support web search
        return null;
      }
      case "mistral":
        return "Mistral Web Search";
      case "claude":
        return "Claude Web Search";
      case "openai":
        return "Web Search";
      case "openai-compat":
        return null; // Needs Brave Search API key
    }
  };

  const searchDescription = getSearchDescription();

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg flex flex-col max-h-[85vh] w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader className="flex flex-row items-center justify-start gap-3 mr-8">
          <DialogTitle className="flex items-center gap-2 font-display text-xl text-secondary truncate">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <span className="truncate">{title}</span>
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive shrink-0">
            Clear
          </Button>
        </DialogHeader>
        <DialogDescription className="sr-only">Chat with AI assistant</DialogDescription>

        {/* Web Search Toggle — only show when search is available */}
        {isConfigured && searchDescription && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary shrink-0" />
              <Label htmlFor="chat-search" className="text-sm cursor-pointer">
                Web Search ({searchDescription})
              </Label>
            </div>
            <Switch
              id="chat-search"
              checked={enableSearch}
              onCheckedChange={async (checked) => {
                setEnableSearch(checked);
                if (config) {
                  await updateConfig({ ...config, enableSearch: checked });
                }
              }}
              disabled={loading}
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-[300px] max-h-[500px] pr-1">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center pt-8">
              {props.mode === "item"
                ? "Ask anything about this saved item."
                : "Ask anything across all your saved items."}
            </p>
          )}
          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words overflow-hidden ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <MarkdownMessage text={m.text} />
                  ) : (
                    m.text
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-2 border-t border-border mt-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={isConfigured ? "Ask something…" : "Configure AI first"}
            className="rounded-xl flex-1 min-w-0"
            disabled={loading}
          />
          <Button
            onClick={isConfigured ? send : props.onOpenAISettings}
            disabled={loading && isConfigured}
            className="rounded-xl gradient-primary text-primary-foreground shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
