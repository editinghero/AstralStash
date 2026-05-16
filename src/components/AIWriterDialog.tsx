import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Bot, Brain, ChevronDown, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAI } from "@/contexts/AIContext";
import { callAI } from "@/lib/ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; text: string };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInsert: (text: string) => void;
  onOpenAISettings: () => void;
  format: "md" | "txt";
  context?: string; // Optional context (current note content)
};

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
function MarkdownMessage({ text, onCopy }: { text: string; onCopy: (text: string) => void }) {
  const { thinking, content } = parseThinkBlocks(text);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(content);
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

export function AIWriterDialog({ open, onOpenChange, onInsert, onOpenAISettings, format, context }: Props) {
  const { config, isConfigured } = useAI();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setPrompt("");
      setResponse(null);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const generate = async () => {
    const q = prompt.trim();
    if (!q || loading) return;
    if (!isConfigured || !config) {
      onOpenAISettings();
      return;
    }

    setLoading(true);
    try {
      const systemPrompt = format === "md"
        ? `You are a helpful writing assistant. Generate content in markdown format using proper formatting:

Available markdown tools:
- **bold** and *italic* for emphasis
- ~~strikethrough~~ for deleted/outdated text
- ## headings for structure (use ##, ###, #### etc.)
- - bullet lists for unordered items
- 1. numbered lists for ordered items
- - [ ] task lists for checkboxes/todos
- \`code\` for inline code or technical terms
- \`\`\`language\ncode block\n\`\`\` for multi-line code blocks
- [links](url) for hyperlinks
- ![alt](image-url) for images
- > quotes for blockquotes
- --- for horizontal rules
- | Table | Header | for tables

${context ? `Current note context:\n${context.slice(0, 500)}\n\n` : ""}Generate clear, well-formatted content based on the user's request.`
        : `You are a helpful writing assistant. Generate content in plain text format.
Do NOT use markdown formatting. Write in plain, readable text with proper line breaks.

${context ? `Current note context:\n${context.slice(0, 500)}\n\n` : ""}Generate clear, well-written content based on the user's request.`;

      const answer = await callAI(config, systemPrompt, q);
      setResponse(answer);
    } catch (e: any) {
      toast.error(e.message || "AI error");
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!response) return;
    const { content } = parseThinkBlocks(response);
    onInsert(content);
    onOpenChange(false);
    toast.success("Content inserted");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-2xl flex flex-col max-h-[85vh] w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl text-secondary">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Writer
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Describe what you want to write, and AI will generate it for you.
          </DialogDescription>
        </DialogHeader>

        {/* Prompt Input */}
        <div className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                generate();
              }
            }}
            placeholder="E.g., 'Write a summary of the benefits of meditation' or 'Create a list of productivity tips'"
            className="rounded-xl min-h-[100px] resize-none"
            disabled={loading}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            {!isConfigured && (
              <Button
                variant="outline"
                onClick={onOpenAISettings}
                className="rounded-xl"
              >
                Configure AI
              </Button>
            )}
            <Button
              onClick={generate}
              disabled={loading || !prompt.trim() || !isConfigured}
              className="rounded-xl gradient-primary text-primary-foreground"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate
            </Button>
          </div>
        </div>

        {/* Response */}
        {response && (
          <div className="flex-1 overflow-y-auto border-t border-border pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium">AI Response</span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 text-sm leading-relaxed">
              {format === "md" ? (
                <MarkdownMessage text={response} onCopy={handleCopy} />
              ) : (
                <div className="relative group whitespace-pre-wrap">
                  {response}
                  <button
                    onClick={() => handleCopy(response)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-background/80 hover:bg-accent border border-border/40"
                    title="Copy response"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setResponse(null)}
                className="rounded-xl"
              >
                Clear
              </Button>
              <Button
                onClick={handleInsert}
                className="rounded-xl gradient-primary text-primary-foreground"
              >
                Insert into {format === "md" ? "Note" : "Text"}
              </Button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </DialogContent>
    </Dialog>
  );
}
