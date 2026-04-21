import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Link2, FileText, Lightbulb, Loader2, Eye, Pencil, Pin, X, Bold, Italic, Heading2, List, Code, Link as LinkIcon, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StashItem, StashType, Collection, fetchLinkMeta, uid, domainOf, faviconFor, NOTE_COLORS, randomNoteColor } from "@/lib/stash";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (item: StashItem) => void;
  onUpdate?: (item: StashItem) => void;
  initialUrl?: string;
  initialTab?: StashType;
  editing?: StashItem | null;
  collections?: Collection[];
};

const TagInput = ({ tags, setTags }: { tags: string[]; setTags: (t: string[]) => void }) => {
  const [input, setInput] = useState("");
  const add = (raw: string) => {
    const v = raw.replace(/^#/, "").trim().toLowerCase();
    if (!v || tags.includes(v)) return;
    setTags([...tags, v]);
  };
  return (
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
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); setInput(""); }
          else if (e.key === "Backspace" && !input && tags.length) setTags(tags.slice(0, -1));
        }}
        onBlur={() => { if (input) { add(input); setInput(""); } }}
        placeholder={tags.length ? "" : "Add tags…"}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
      />
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

export const AddItemDialog = ({ open, onOpenChange, onAdd, onUpdate, initialUrl, initialTab = "link", editing, collections = [] }: Props) => {
  const [tab, setTab] = useState<StashType>(initialTab);
  const [tags, setTags] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDesc, setLinkDesc] = useState("");
  const [linkImage, setLinkImage] = useState("");
  const [favicon, setFavicon] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [preview, setPreview] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const [ideaText, setIdeaText] = useState("");

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
        setFavicon(editing.favicon);
      } else if (editing.type === "note") {
        setNoteTitle(editing.title);
        setNoteBody(editing.content || "");
        setNoteColor(editing.color || NOTE_COLORS[0]);
      } else {
        setIdeaText(editing.content || editing.title);
      }
    } else {
      setTab(initialUrl ? "link" : initialTab);
      setTags([]); setPinned(false); setCollectionId(null);
      setUrl(initialUrl ?? "");
      setLinkTitle(""); setLinkDesc(""); setLinkImage(""); setFavicon(undefined);
      setNoteTitle(""); setNoteBody(""); setNoteColor(NOTE_COLORS[0]); setPreview(false);
      setIdeaText("");
      if (initialUrl) void loadMeta(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialUrl, initialTab, editing]);

  const loadMeta = async (u: string) => {
    if (!/^https?:\/\//i.test(u)) return;
    setLoading(true);
    try {
      const m = await fetchLinkMeta(u);
      setLinkTitle((prev) => prev || m.title || domainOf(u));
      setLinkDesc((prev) => prev || m.description || "");
      setLinkImage((prev) => prev || m.image || "");
      setFavicon(m.favicon || faviconFor(u));
    } finally { setLoading(false); }
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
      favicon: favicon || faviconFor(url),
    });
  };
  const saveNote = () => {
    if (!noteTitle.trim() && !noteBody.trim()) return toast.error("Add a title or content");
    commit({
      ...baseItem(), type: "note",
      title: noteTitle.trim() || "Untitled note",
      content: noteBody, color: noteColor,
    });
  };
  const saveIdea = () => {
    if (!ideaText.trim()) return toast.error("Write your idea first");
    const firstLine = ideaText.split("\n")[0].slice(0, 80);
    commit({
      ...baseItem(), type: "idea",
      title: firstLine || "Quick idea",
      content: ideaText,
      color: editing?.color || randomNoteColor(),
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
            <div className="flex gap-2">
              <Input autoFocus placeholder="https://example.com" value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => url && !isEdit && loadMeta(url)}
                onKeyDown={(e) => { if (e.key === "Enter") loadMeta(url); }}
                className="rounded-xl" />
              <Button onClick={() => loadMeta(url)} variant="secondary" className="rounded-xl shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
              </Button>
            </div>

            {(loading || linkTitle || linkImage) && (
              <div className="rounded-2xl border bg-muted/40 p-3 flex gap-3 animate-fade-in">
                {linkImage ? (
                  <img src={linkImage} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0"
                    onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : (
                  <div className="w-24 h-24 rounded-xl gradient-warm shrink-0 flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Fetching preview…</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {favicon && <img src={favicon} className="w-3.5 h-3.5" alt="" />}
                        <span className="truncate">{url ? domainOf(url) : ""}</span>
                      </div>
                      <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Title" className="rounded-lg h-9 font-display" />
                      <Input value={linkDesc} onChange={(e) => setLinkDesc(e.target.value)} placeholder="Description" className="rounded-lg h-8 text-xs" />
                    </>
                  )}
                </div>
              </div>
            )}

            <Input value={linkImage} onChange={(e) => setLinkImage(e.target.value)} placeholder="Image URL (optional)" className="rounded-xl" />
            <CollectionPicker value={collectionId} onChange={setCollectionId} collections={collections} />
            <TagInput tags={tags} setTags={setTags} />
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => wrapMd("**")} className="h-8 w-8 p-0"><Bold className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => wrapMd("*")} className="h-8 w-8 p-0"><Italic className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => wrapMd("\n## ", "")} className="h-8 w-8 p-0"><Heading2 className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => wrapMd("\n- ", "")} className="h-8 w-8 p-0"><List className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => wrapMd("`")} className="h-8 w-8 p-0"><Code className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => wrapMd("[", "](url)")} className="h-8 w-8 p-0"><LinkIcon className="w-3.5 h-3.5" /></Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPreview((p) => !p)} className="rounded-lg gap-1.5 h-7 text-xs">
                {preview ? <><Pencil className="w-3 h-3" /> Edit</> : <><Eye className="w-3 h-3" /> Preview</>}
              </Button>
            </div>
            {preview ? (
              <div className="min-h-[200px] rounded-xl border bg-muted/30 p-4 prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-a:text-primary animate-fade-in">
                <ReactMarkdown>{noteBody || "*Nothing to preview yet…*"}</ReactMarkdown>
              </div>
            ) : (
              <Textarea ref={noteRef} placeholder="Write your note in **markdown**…"
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
            <CollectionPicker value={collectionId} onChange={setCollectionId} collections={collections} />
            <TagInput tags={tags} setTags={setTags} />
            <div className="flex items-center justify-between pt-2">
              <PinToggle pinned={pinned} setPinned={setPinned} />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={saveNote} className="rounded-xl gradient-primary text-primary-foreground shadow-pink hover:opacity-95">{isEdit ? "Save" : "Save note"}</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="idea" className="space-y-4 mt-4">
            <Textarea autoFocus placeholder="What's on your mind?"
              value={ideaText} onChange={(e) => setIdeaText(e.target.value)}
              className="rounded-xl min-h-[180px] font-display text-xl leading-snug" />
            <p className="text-xs text-muted-foreground">First line becomes the title. A pastel color is auto-assigned.</p>
            <CollectionPicker value={collectionId} onChange={setCollectionId} collections={collections} />
            <TagInput tags={tags} setTags={setTags} />
            <div className="flex items-center justify-between pt-2">
              <PinToggle pinned={pinned} setPinned={setPinned} />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={saveIdea} className="rounded-xl gradient-primary text-primary-foreground shadow-pink hover:opacity-95">{isEdit ? "Save" : "Save idea"}</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
