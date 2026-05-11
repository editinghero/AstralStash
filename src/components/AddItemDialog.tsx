import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Link2, FileText, Lightbulb, Loader2, Eye, Pencil, Pin, X, Bold, Italic, Heading2, List, Code, Link as LinkIcon, FolderOpen, Quote, HelpCircle, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StashItem, StashType, Collection, fetchLinkMeta, uid, domainOf, faviconFor, NOTE_COLORS, randomNoteColor } from "@/lib/stash";
import { toast } from "sonner";
import { useAI } from "@/contexts/AIContext";
import { suggestTags, summarizeContent } from "@/lib/ai";
import { AISettingsDialog } from "@/components/AISettingsDialog";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (item: StashItem) => void;
  onUpdate?: (item: StashItem) => void;
  initialUrl?: string;
  initialTab?: StashType;
  editing?: StashItem | null;
  collections?: Collection[];
  allItems?: StashItem[];
};

const TagInput = ({ tags, setTags, allItems = [] }: { tags: string[]; setTags: (t: string[]) => void; allItems?: StashItem[] }) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Get all unique tags from all items
  const allTags = Array.from(new Set(allItems.flatMap(item => item.tags || [])));
  
  const add = (raw: string) => {
    const v = raw.replace(/^#/, "").trim().toLowerCase();
    if (!v || tags.includes(v)) return;
    setTags([...tags, v]);
  };
  
  const handleInputChange = (value: string) => {
    setInput(value);
    const trimmed = value.replace(/^#/, "").trim().toLowerCase();
    if (trimmed) {
      const filtered = allTags.filter(t => 
        t.toLowerCase().includes(trimmed) && !tags.includes(t)
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };
  
  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 items-center rounded-xl border bg-background px-2.5 py-2 min-h-11">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-accent text-accent-foreground animate-scale-in">
            #{t}
            <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { 
              e.preventDefault(); 
              add(input); 
              setInput(""); 
              setShowSuggestions(false);
            }
            else if (e.key === "Backspace" && !input && tags.length) setTags(tags.slice(0, -1));
            else if (e.key === "Escape") setShowSuggestions(false);
          }}
          onBlur={() => { 
            setTimeout(() => {
              if (input) { add(input); setInput(""); }
              setShowSuggestions(false);
            }, 200);
          }}
          onFocus={() => {
            if (input && suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={tags.length ? "" : "Add tags…"}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                add(tag);
                setInput("");
                setShowSuggestions(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PinToggle = ({ pinned, setPinned }: { pinned: boolean; setPinned: (b: boolean) => void }) => (
  <button
    type="button"
    onClick={() => setPinned(!pinned)}
    className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium transition-all ${
      pinned ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground hover:bg-accent"
    }`}
  >
    <Pin className={`w-3.5 h-3.5 ${pinned ? "fill-current" : ""}`} />
    {pinned ? "Pinned" : "Pin"}
  </button>
);

const CollectionPicker = ({ value, onChange, collections }: { value: string | null; onChange: (v: string | null) => void; collections: Collection[] }) => {
  if (!collections.length) return null;
  return (
    <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
      <SelectTrigger className="rounded-xl h-10 w-full">
        <div className="flex items-center gap-2 truncate">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <SelectValue placeholder="No collection" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No collection</SelectItem>
        {collections.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.emoji ? `${c.emoji} ` : ""}{c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const AddItemDialog = ({ open, onOpenChange, onAdd, onUpdate, initialUrl, initialTab = "link", editing, collections = [], allItems = [] }: Props) => {
  const [tab, setTab] = useState<StashType>(initialTab);
  const [tags, setTags] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDesc, setLinkDesc] = useState("");
  const [linkImage, setLinkImage] = useState("");
  const [linkColor, setLinkColor] = useState(NOTE_COLORS[0]);
  const [favicon, setFavicon] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [noteFormat, setNoteFormat] = useState<"md" | "txt">("md");
  const [preview, setPreview] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [ideaColor, setIdeaColor] = useState(NOTE_COLORS[0]);

  // AI state
  const { config, isConfigured } = useAI();
  const [aiTagging, setAiTagging] = useState(false);
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  const isEdit = !!editing;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTab(editing.type);
      setTags(editing.tags || []);
      setPinned(editing.pinned);
      setCollectionId(editing.collectionId ?? null);
      if (editing.type === "link") {
        setUrl(editing.url || "");
        setLinkTitle(editing.title);
        setLinkDesc(editing.description || "");
        setLinkImage(editing.image || "");
        setLinkColor(editing.color || NOTE_COLORS[0]);
        setFavicon(editing.favicon);
      } else if (editing.type === "note") {
        setNoteTitle(editing.title);
        setNoteBody(editing.content || "");
        setNoteColor(editing.color || NOTE_COLORS[0]);
        setNoteFormat(editing.format || "md");
      } else {
        setIdeaTitle(editing.title === "Quick idea" ? "" : editing.title);
        setIdeaText(editing.content || "");
        setIdeaColor(editing.color || NOTE_COLORS[0]);
      }
    } else {
      setTab(initialUrl ? "link" : initialTab);
      setTags([]); setPinned(false); setCollectionId(null);
      setUrl(initialUrl ?? "");
      setLinkTitle(""); setLinkDesc(""); setLinkImage(""); setLinkColor(NOTE_COLORS[0]); setFavicon(undefined);
      setNoteTitle(""); setNoteBody(""); setNoteColor(NOTE_COLORS[0]); setNoteFormat("md"); setPreview(false);
      setIdeaTitle(""); setIdeaText(""); setIdeaColor(NOTE_COLORS[0]);
      if (initialUrl) void loadMeta(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialUrl, initialTab, editing]);

  const loadMeta = async (u: string) => {
    if (!/^https?:\/\//i.test(u)) return;
    
    // Cancel any existing fetch
    if (abortController) {
      abortController.abort();
    }
    
    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    
    try {
      const m = await fetchLinkMeta(u, controller.signal);
      if (!controller.signal.aborted) {
        setLinkTitle((prev) => prev || m.title || domainOf(u));
        setLinkDesc((prev) => prev || m.description || "");
        setFavicon(m.favicon || faviconFor(u));
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch meta:', error);
        toast.error('Failed to fetch page info');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setAbortController(null);
      }
    }
  };

  const cancelFetch = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      toast.info('Fetch cancelled');
    }
  };

  const handleAutoTag = async () => {
    if (!isConfigured || !config) { setAiSettingsOpen(true); return; }
    
    // Get current content based on tab
    let title = "", description = "", content = "";
    if (tab === "link") {
      title = linkTitle;
      description = linkDesc;
      content = "";
    } else if (tab === "note") {
      title = noteTitle;
      description = "";
      content = noteBody;
    } else {
      title = ideaTitle || "Quick idea";
      description = "";
      content = ideaText;
    }
    
    if (!title && !content) {
      toast.error("Add some content first");
      return;
    }
    
    setAiTagging(true);
    try {
      const allTags = Array.from(new Set(allItems.flatMap((i) => i.tags)));
      const suggested = await suggestTags(config, title, description, content, allTags);
      const newTags = suggested.filter((t) => !tags.includes(t));
      setTags((prev) => [...prev, ...newTags]);
      if (newTags.length) toast.success(`Added ${newTags.length} tag${newTags.length > 1 ? "s" : ""}`);
      else toast.info("No new tags to add");
    } catch (e: any) {
      toast.error(e.message || "Auto-tag failed");
    } finally {
      setAiTagging(false);
    }
  };

  const handleSummarize = async () => {
    if (!isConfigured || !config) { setAiSettingsOpen(true); return; }
    
    // Get current content based on tab
    let title = "", description = "", content = "";
    if (tab === "link") {
      title = linkTitle;
      description = linkDesc;
      content = "";
    } else if (tab === "note") {
      title = noteTitle;
      description = "";
      content = noteBody;
    } else {
      title = ideaTitle || "Quick idea";
      description = "";
      content = ideaText;
    }
    
    if (!title && !content) {
      toast.error("Add some content first");
      return;
    }
    
    setAiSummarizing(true);
    try {
      const summary = await summarizeContent(config, title, description, content);
      // Set description based on tab
      if (tab === "link") {
        setLinkDesc(summary.trim());
      } else if (tab === "note") {
        setNoteBody((prev) => (prev ? prev + "\n\n" : "") + summary.trim());
      } else {
        setIdeaText((prev) => (prev ? prev + "\n\n" : "") + summary.trim());
      }
      toast.success("Summary added");
    } catch (e: any) {
      toast.error(e.message || "Summarize failed");
    } finally {
      setAiSummarizing(false);
    }
  };

  const baseItem = (): Omit<StashItem, "type" | "title"> => ({
    id: editing?.id || uid(),
    tags, pinned,
    collectionId,
    deleted: editing?.deleted ?? false,
    deletedAt: editing?.deletedAt ?? null,
    createdAt: editing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });

  const commit = (item: StashItem) => {
    if (isEdit && onUpdate) { onUpdate(item); toast.success("Updated ✨"); }
    else { onAdd(item); toast.success("Saved ✨"); }
    onOpenChange(false);
  };

  const saveLink = () => {
    if (!url) return toast.error("Please enter a URL");
    commit({
      ...baseItem(), type: "link",
      title: linkTitle || domainOf(url),
      url, description: linkDesc || undefined,
      image: linkImage || undefined,
      color: linkImage ? undefined : linkColor,
      favicon: favicon || faviconFor(url),
    });
  };
  const saveNote = () => {
    if (!noteTitle.trim() && !noteBody.trim()) return toast.error("Add a title or content");
    commit({
      ...baseItem(), type: "note",
      title: noteTitle.trim() || "Untitled note",
      content: noteBody, 
      color: noteColor,
      format: noteFormat,
    });
  };
  const saveIdea = () => {
    if (!ideaText.trim()) return toast.error("Write your idea first");
    const finalTitle = ideaTitle.trim() || "Quick idea";
    commit({
      ...baseItem(), type: "idea",
      title: finalTitle,
      content: ideaText,
      color: ideaColor,
    });
  };

  const wrapMd = (before: string, after = before) => {
    const ta = noteRef.current; if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = noteBody.slice(start, end) || "text";
    const next = noteBody.slice(0, start) + before + sel + after + noteBody.slice(end);
    setNoteBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-secondary">
            {isEdit ? "Edit item" : "Save something"}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => !isEdit && setTab(v as StashType)}>
          <TabsList className={`grid w-full grid-cols-3 rounded-xl ${isEdit ? "opacity-60 pointer-events-none" : ""}`}>
            <TabsTrigger value="link" className="rounded-lg gap-2"><Link2 className="w-4 h-4" /> Link</TabsTrigger>
            <TabsTrigger value="note" className="rounded-lg gap-2"><FileText className="w-4 h-4" /> Note</TabsTrigger>
            <TabsTrigger value="idea" className="rounded-lg gap-2"><Lightbulb className="w-4 h-4" /> Idea</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground ml-1">URL</label>
              <div className="flex gap-2">
                <Input autoFocus placeholder="https://example.com" value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={() => url && !isEdit && !loading && loadMeta(url)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !loading) loadMeta(url); }}
                  className="rounded-xl" />
                {loading ? (
                  <Button onClick={cancelFetch} variant="ghost" size="icon" className="rounded-xl shrink-0" title="Cancel fetch">
                    <X className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button onClick={() => loadMeta(url)} variant="secondary" className="rounded-xl shrink-0">
                    Fetch
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground ml-1">Title</label>
                <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Site title" className="rounded-xl font-display" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground ml-1">Note / Description</label>
                <Input value={linkDesc} onChange={(e) => setLinkDesc(e.target.value)} placeholder="Add a small note…" className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Image URL (optional)</label>
              <Input 
                value={linkImage} 
                onChange={(e) => {
                  const newValue = e.target.value;
                  setLinkImage(newValue);
                  // Force re-render by updating a timestamp or similar
                }} 
                placeholder="https://example.com/image.jpg" 
                className="rounded-xl" 
              />
              
              {linkImage && linkImage.trim() !== "" && (
                <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden border bg-muted/40 flex items-center justify-center">
                  <img 
                    src={linkImage} 
                    alt="Preview" 
                    className="w-full h-full object-cover animate-fade-in"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = "text-sm text-muted-foreground";
                        errorDiv.textContent = "Failed to load image";
                        parent.appendChild(errorDiv);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {(!linkImage || linkImage.trim() === "") && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground ml-1">Background Color (when no image)</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {NOTE_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setLinkColor(c)}
                      style={{ background: c }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${linkColor === c ? "border-primary scale-110" : "border-border"}`}
                      aria-label={`Color ${c}`} />
                  ))}
                </div>
              </div>
            )}

            {/* AI Assist row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Assist
              </span>
              <button
                type="button"
                onClick={handleSummarize}
                disabled={aiSummarizing || (!linkTitle && !url)}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs bg-muted hover:bg-accent transition-colors disabled:opacity-40"
              >
                {aiSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : "📝"}
                Summarize
              </button>
              <button
                type="button"
                onClick={handleAutoTag}
                disabled={aiTagging || (!linkTitle && !url)}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs bg-muted hover:bg-accent transition-colors disabled:opacity-40"
              >
                {aiTagging ? <Loader2 className="w-3 h-3 animate-spin" /> : "🏷"}
                Auto-tag
              </button>
              {!isConfigured && (
                <button
                  type="button"
                  onClick={() => setAiSettingsOpen(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Configure AI →
                </button>
              )}
            </div>

            <CollectionPicker value={collectionId} onChange={setCollectionId} collections={collections} />
            <TagInput tags={tags} setTags={setTags} allItems={allItems} />
            <div className="flex items-center justify-between pt-2">
              <PinToggle pinned={pinned} setPinned={setPinned} />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={saveLink} className="rounded-xl gradient-primary text-primary-foreground shadow-pink hover:opacity-95">{isEdit ? "Save" : "Save link"}</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="note" className="space-y-4 mt-4">
            <Input autoFocus placeholder="Title" value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="rounded-xl font-display text-lg" />
            
            {/* Format Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Format:</span>
              <Button
                size="sm"
                variant={noteFormat === "md" ? "default" : "outline"}
                onClick={() => setNoteFormat("md")}
                className="h-7 text-xs rounded-lg"
              >
                Markdown
              </Button>
              <Button
                size="sm"
                variant={noteFormat === "txt" ? "default" : "outline"}
                onClick={() => setNoteFormat("txt")}
                className="h-7 text-xs rounded-lg"
              >
                Plain Text
              </Button>
            </div>

            {noteFormat === "md" && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => wrapMd("**")} className="h-8 w-8 p-0" title="Bold"><Bold className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => wrapMd("*")} className="h-8 w-8 p-0" title="Italic"><Italic className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => wrapMd("\n## ", "")} className="h-8 w-8 p-0" title="Heading"><Heading2 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => wrapMd("\n- ", "")} className="h-8 w-8 p-0" title="List"><List className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => wrapMd("`")} className="h-8 w-8 p-0" title="Code"><Code className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => wrapMd("[", "](url)")} className="h-8 w-8 p-0" title="Link"><LinkIcon className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => wrapMd("\n> ", "")} className="h-8 w-8 p-0" title="Quote"><Quote className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="flex items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Help">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-3 text-sm">
                        <div>
                          <h4 className="font-semibold mb-1">Markdown Format</h4>
                          <p className="text-xs text-muted-foreground">
                            Use markdown syntax for rich formatting: **bold**, *italic*, ## headings, - lists, `code`, [links](url), and &gt; quotes.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Line Breaks</h4>
                          <p className="text-xs text-muted-foreground">
                            In Markdown: Add two spaces at end of line, or use <code className="text-xs bg-muted px-1 rounded">&lt;br&gt;</code> tag for manual breaks. Double Enter creates new paragraph.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Plain Text Format</h4>
                          <p className="text-xs text-muted-foreground">
                            Plain text preserves all line breaks exactly as typed. No formatting applied.
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button size="sm" variant="ghost" onClick={() => setPreview((p) => !p)} className="rounded-lg gap-1.5 h-7 text-xs">
                    {preview ? <><Pencil className="w-3 h-3" /> Edit</> : <><Eye className="w-3 h-3" /> Preview</>}
                  </Button>
                </div>
              </div>
            )}

            {preview && noteFormat === "md" ? (
              <div className="min-h-[200px] rounded-xl border bg-muted/30 p-4 prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-a:text-primary prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:italic prose-blockquote:font-serif animate-fade-in">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{noteBody || "*Nothing to preview yet…*"}</ReactMarkdown>
              </div>
            ) : (
              <Textarea ref={noteRef} placeholder={noteFormat === "md" ? "Write your note in **markdown**…" : "Write your note in plain text…"}
                value={noteBody} onChange={(e) => setNoteBody(e.target.value)}
                className="rounded-xl min-h-[200px] font-mono text-sm" />
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Color:</span>
              {NOTE_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setNoteColor(c)}
                  style={{ background: c }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${noteColor === c ? "border-primary scale-110" : "border-border"}`}
                  aria-label={`Color ${c}`} />
              ))}
            </div>

            {/* AI Assist row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Assist
              </span>
              <button
                type="button"
                onClick={handleSummarize}
                disabled={aiSummarizing || (!noteTitle && !noteBody)}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs bg-muted hover:bg-accent transition-colors disabled:opacity-40"
              >
                {aiSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : "📝"}
                Summarize
              </button>
              <button
                type="button"
                onClick={handleAutoTag}
                disabled={aiTagging || (!noteTitle && !noteBody)}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs bg-muted hover:bg-accent transition-colors disabled:opacity-40"
              >
                {aiTagging ? <Loader2 className="w-3 h-3 animate-spin" /> : "🏷"}
                Auto-tag
              </button>
              {!isConfigured && (
                <button
                  type="button"
                  onClick={() => setAiSettingsOpen(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Configure AI →
                </button>
              )}
            </div>

            <CollectionPicker value={collectionId} onChange={setCollectionId} collections={collections} />
            <TagInput tags={tags} setTags={setTags} allItems={allItems} />
            <div className="flex items-center justify-between pt-2">
              <PinToggle pinned={pinned} setPinned={setPinned} />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={saveNote} className="rounded-xl gradient-primary text-primary-foreground shadow-pink hover:opacity-95">{isEdit ? "Save" : "Save note"}</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="idea" className="space-y-4 mt-4">
            <Input placeholder="Title (optional)" value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              className="rounded-xl font-display text-lg" />
            <Textarea autoFocus placeholder="What's on your mind?"
              value={ideaText} onChange={(e) => setIdeaText(e.target.value)}
              className="rounded-xl min-h-[180px] font-display text-xl leading-snug" />
            <p className="text-xs text-muted-foreground">Leave title blank to auto-generate "Quick idea".</p>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground ml-1">Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {NOTE_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setIdeaColor(c)}
                    style={{ background: c }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${ideaColor === c ? "border-primary scale-110" : "border-border"}`}
                    aria-label={`Color ${c}`} />
                ))}
              </div>
            </div>

            {/* AI Assist row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Assist
              </span>
              <button
                type="button"
                onClick={handleSummarize}
                disabled={aiSummarizing || !ideaText}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs bg-muted hover:bg-accent transition-colors disabled:opacity-40"
              >
                {aiSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : "📝"}
                Summarize
              </button>
              <button
                type="button"
                onClick={handleAutoTag}
                disabled={aiTagging || !ideaText}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs bg-muted hover:bg-accent transition-colors disabled:opacity-40"
              >
                {aiTagging ? <Loader2 className="w-3 h-3 animate-spin" /> : "🏷"}
                Auto-tag
              </button>
              {!isConfigured && (
                <button
                  type="button"
                  onClick={() => setAiSettingsOpen(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Configure AI →
                </button>
              )}
            </div>

            <CollectionPicker value={collectionId} onChange={setCollectionId} collections={collections} />
            <TagInput tags={tags} setTags={setTags} allItems={allItems} />
            <div className="flex items-center justify-between pt-2">
              <PinToggle pinned={pinned} setPinned={setPinned} />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={saveIdea} className="rounded-xl gradient-primary text-primary-foreground shadow-pink hover:opacity-95">{isEdit ? "Save" : "Save idea"}</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <AISettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />
      </DialogContent>
    </Dialog>
  );
};
