import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAI } from "@/contexts/AIContext";
import { chatWithItem, chatWithKnowledgeBase } from "@/lib/ai";
import { StashItem } from "@/lib/stash";

type Message = { role: "user" | "assistant"; text: string };

type Props =
  | { mode: "item"; item: StashItem; open: boolean; onOpenChange: (o: boolean) => void; onOpenAISettings: () => void }
  | { mode: "kb"; items: StashItem[]; open: boolean; onOpenChange: (o: boolean) => void; onOpenAISettings: () => void };

export function AIChatDialog(props: Props) {
  const { config, isConfigured } = useAI();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (props.open) {
      setMessages([]);
      setInput("");
    }
  }, [props.open]);

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

      if (props.mode === "item") {
        answer = await chatWithItem(config, props.item, history, q);
      } else {
        const live = props.items.filter((i) => !i.deleted);
        answer = await chatWithKnowledgeBase(config, live, history, q);
      }

      setMessages([...next, { role: "assistant", text: answer }]);
    } catch (e: any) {
      toast.error(e.message || "AI error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg flex flex-col max-h-[80vh] w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl text-secondary truncate">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-[200px] max-h-[400px] pr-1">
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
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  {m.text}
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
        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={isConfigured ? "Ask something…" : "Configure AI first"}
            className="rounded-xl"
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
