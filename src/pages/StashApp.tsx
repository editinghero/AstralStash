import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams, Link } from "react-router-dom";
import {
  Plus, Search, Link2, FileText, LayoutGrid, Tag as TagIcon, Inbox, Menu, X,
  Pin, Trash2, Lightbulb, Download, Upload, Keyboard, Sparkles, FolderOpen,
  Bookmark, Command as CommandIcon, MoreHorizontal, User as UserIcon, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StashCard } from "@/components/StashCard";
import { AddItemDialog } from "@/components/AddItemDialog";
import { EnlargedViewDialog } from "@/components/EnlargedViewDialog";
import { CommandPalette, PaletteAction } from "@/components/CommandPalette";
import { CollectionDialog } from "@/components/CollectionDialog";
import { BookmarkletDialog } from "@/components/BookmarkletDialog";
import { StashItem, StashType, Collection, exportItems, mergeImport } from "@/lib/stash";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAI } from "@/contexts/AIContext";
import { smartSearch } from "@/lib/ai";
import { AIChatDialog } from "@/components/AIChatDialog";
import { AISettingsDialog } from "@/components/AISettingsDialog";

type Filter = "all" | "link" | "note" | "idea" | "pinned" | "trash" | "collection";
type Sort = "newest" | "oldest" | "title" | "type";

const TAG_COLORS = [
  "bg-rose-300", "bg-amber-300", "bg-emerald-300",
  "bg-sky-300", "bg-violet-300", "bg-orange-300",
];
const tagColor = (t: string) =>
  TAG_COLORS[Math.abs([...t].reduce((a, c) => a + c.charCodeAt(0), 0)) % TAG_COLORS.length];

const StashApp = () => {
  const [items, setItems] = useState<StashItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("newest");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StashItem | null>(null);
  const [initialUrl, setInitialUrl] = useState<string | undefined>();
  const [initialTab, setInitialTab] = useState<StashType>("link");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [bookmarkletOpen, setBookmarkletOpen] = useState(false);
  const [enlargedItem, setEnlargedItem] = useState<StashItem | null>(null);
  const [enlargedOpen, setEnlargedOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar:collections:open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [tagsOpen, setTagsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar:tags:open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const { theme, toggle: toggleTheme } = useTheme();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // AI state
  const { config, isConfigured } = useAI();
  const [smartSearchEnabled, setSmartSearchEnabled] = useState(false);
  const [smartSearchResults, setSmartSearchResults] = useState<string[] | null>(null);
  const [smartSearching, setSmartSearching] = useState(false);
  const [kbChatOpen, setKbChatOpen] = useState(false);
  const [itemChatOpen, setItemChatOpen] = useState(false);
  const [chatItem, setChatItem] = useState<StashItem | null>(null);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  // Load items and collections from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const [itemsData, collectionsData] = await Promise.all([
          api.getItems(),
          api.getCollections(),
        ]);
        setItems(itemsData.items);
        setCollections(collectionsData.collections);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load your stash');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Save sidebar collapse state
  useEffect(() => {
    localStorage.setItem('sidebar:collections:open', JSON.stringify(collectionsOpen));
  }, [collectionsOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar:tags:open', JSON.stringify(tagsOpen));
  }, [tagsOpen]);

  // Bookmarklet handoff
  useEffect(() => {
    const save = searchParams.get("save");
    const title = searchParams.get("title");
    if (save) {
      setInitialUrl(save);
      setInitialTab("link");
      setEditing(null);
      setOpen(true);
      // Pre-warm title via state? AddItemDialog fetches meta; OK as-is.
      void title;
      const next = new URLSearchParams(searchParams);
      next.delete("save"); next.delete("title");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const text = e.clipboardData?.getData("text")?.trim();
      if (text && /^https?:\/\//i.test(text)) {
        setEditing(null); setInitialUrl(text); setInitialTab("link"); setOpen(true);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target && ["INPUT", "TEXTAREA"].includes(target.tagName);
      
      // ⌘⇧K or Ctrl+Shift+K - AI Knowledge Base Chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault(); 
        if (isConfigured) {
          setKbChatOpen(true);
        }
        return;
      }
      
      // ⌘K or Ctrl+K - Command Palette (only if Shift is NOT pressed)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault(); setPaletteOpen((o) => !o); return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n" && !inField) {
        e.preventDefault(); setEditing(null); setInitialUrl(undefined); setInitialTab("note"); setOpen(true);
      }
      if (e.key === "/" && !inField) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("input[data-search]")?.focus();
      }
      if (e.key === "Escape") { setSidebarOpen(false); setShortcutsOpen(false); }
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("paste", onPaste); window.removeEventListener("keydown", onKey); };
  }, [isConfigured]);

  const live = useMemo(() => items.filter((i) => !i.deleted), [items]);
  const trashed = useMemo(() => items.filter((i) => i.deleted), [items]);

  // Smart search effect
  useEffect(() => {
    if (!smartSearchEnabled || !query.trim() || !config) {
      setSmartSearchResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setSmartSearching(true);
      try {
        const ids = await smartSearch(config, query, live);
        setSmartSearchResults(ids);
      } catch {
        setSmartSearchResults(null);
      } finally {
        setSmartSearching(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [query, smartSearchEnabled, config, live]);

  const tags = useMemo(() => {
    const map = new Map<string, number>();
    live.forEach((i) => i.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [live]);

  const counts = useMemo(() => ({
    all: live.length,
    link: live.filter((i) => i.type === "link").length,
    note: live.filter((i) => i.type === "note").length,
    idea: live.filter((i) => i.type === "idea").length,
    pinned: live.filter((i) => i.pinned).length,
    trash: trashed.length,
  }), [live, trashed]);

  const collectionCounts = useMemo(() => {
    const m = new Map<string, number>();
    live.forEach((i) => { if (i.collectionId) m.set(i.collectionId, (m.get(i.collectionId) ?? 0) + 1); });
    return m;
  }, [live]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = filter === "trash" ? trashed : live;
    
    let list = source.filter((i) => {
      if (filter === "link" || filter === "note" || filter === "idea") {
        if (i.type !== filter) return false;
      }
      if (filter === "pinned" && !i.pinned) return false;
      if (filter === "collection" && i.collectionId !== activeCollection) return false;
      if (activeTag && !i.tags.includes(activeTag)) return false;
      if (!q) return true;
      
      // If smart search is enabled and we have results, filter by those IDs
      if (smartSearchEnabled && smartSearchResults) {
        return smartSearchResults.includes(i.id);
      }
      
      // Otherwise use regular text search
      const hay = [i.title, i.description ?? "", i.content ?? "", i.url ?? "", i.tags.join(" ")].join(" ").toLowerCase();
      return hay.includes(q);
    });
    
    // If smart search is enabled and we have results, sort by relevance (order in smartSearchResults)
    if (smartSearchEnabled && smartSearchResults && q) {
      list = [...list].sort((a, b) => {
        const aIndex = smartSearchResults.indexOf(a.id);
        const bIndex = smartSearchResults.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    } else {
      // Regular sorting
      list = [...list].sort((a, b) => {
        if (sort === "newest") return b.createdAt - a.createdAt;
        if (sort === "oldest") return a.createdAt - b.createdAt;
        if (sort === "type") return a.type.localeCompare(b.type);
        return a.title.localeCompare(b.title);
      });
    }
    
    return list;
  }, [live, trashed, query, filter, activeCollection, activeTag, sort, smartSearchEnabled, smartSearchResults]);

  const showSections = filter === "all" && !activeTag && !query;
  const pinnedSection = useMemo(() => (showSections ? filtered.filter((i) => i.pinned) : []), [showSections, filtered]);
  const restSection = useMemo(() => (showSections ? filtered.filter((i) => !i.pinned) : filtered), [showSections, filtered]);

  const addItem = async (item: StashItem) => {
    try {
      const { item: savedItem } = await api.createItem(item);
      setItems((prev) => [savedItem, ...prev]);
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to save item');
    }
  };

  const updateItem = async (item: StashItem) => {
    try {
      const { item: updatedItem } = await api.updateItem(item.id, { ...item, updatedAt: Date.now() });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  };

  const softDelete = async (id: string) => {
    try {
      await api.updateItem(id, { deleted: true, deletedAt: Date.now() });
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, deleted: true, deletedAt: Date.now() } : i));
      toast("Moved to trash", {
        action: { 
          label: "Undo", 
          onClick: async () => {
            try {
              await api.updateItem(id, { deleted: false, deletedAt: null });
              setItems((prev) => prev.map((i) => i.id === id ? { ...i, deleted: false, deletedAt: null } : i));
            } catch (error) {
              console.error('Failed to undo:', error);
              toast.error('Failed to undo');
            }
          }
        },
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item');
    }
  };

  const restore = async (id: string) => {
    try {
      await api.updateItem(id, { deleted: false, deletedAt: null });
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, deleted: false, deletedAt: null } : i));
      toast.success("Restored");
    } catch (error) {
      console.error('Failed to restore item:', error);
      toast.error('Failed to restore item');
    }
  };

  const purge = async (id: string) => {
    try {
      await api.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error('Failed to purge item:', error);
      toast.error('Failed to delete permanently');
    }
  };

  const togglePin = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    try {
      await api.updateItem(id, { pinned: !item.pinned, updatedAt: Date.now() });
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, pinned: !i.pinned, updatedAt: Date.now() } : i));
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      toast.error('Failed to update pin status');
    }
  };

  const emptyTrash = async () => {
    const trashedItems = items.filter((i) => i.deleted);
    try {
      await Promise.all(trashedItems.map((i) => api.deleteItem(i.id)));
      setItems((prev) => prev.filter((i) => !i.deleted));
      toast.success("Trash emptied");
    } catch (error) {
      console.error('Failed to empty trash:', error);
      toast.error('Failed to empty trash');
    }
  };

  const openAdd = (tab: StashType = "link") => {
    setEditing(null); setInitialUrl(undefined); setInitialTab(tab); setOpen(true); setSidebarOpen(false);
  };
  const openEdit = (item: StashItem) => { setEditing(item); setOpen(true); };
  const openEnlarged = (item: StashItem) => { setEnlargedItem(item); setEnlargedOpen(true); };
  const openItemChat = (item: StashItem) => { setChatItem(item); setItemChatOpen(true); };

  const importJson = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { items: merged, collections: mc, result } = mergeImport(items, collections, parsed);
      setItems(merged); setCollections(mc);
      toast.success(`Imported: ${result.added} new, ${result.updated} updated`);
    } catch { toast.error("Invalid JSON file"); }
    finally { e.target.value = ""; }
  };

  const handlePalette = (a: PaletteAction) => {
    if (a.kind === "new") openAdd(a.type);
    else if (a.kind === "filter") { setFilter(a.value); setActiveTag(null); setActiveCollection(null); }
    else if (a.kind === "collection") { setFilter("collection"); setActiveCollection(a.id); setActiveTag(null); }
    else if (a.kind === "open") openEdit(a.item);
    else if (a.kind === "theme") toggleTheme();
    else if (a.kind === "export") exportItems(items, collections);
    else if (a.kind === "import") importJson();
  };

  const sidebar = (
    <aside className="space-y-6 flex flex-col h-full overflow-y-auto sidebar-scroll w-full">
      <div className="space-y-6 px-1">
        <Button onClick={() => openAdd("link")}
          className="w-full rounded-xl gradient-primary text-primary-foreground shadow-pink hover:opacity-95 h-11 transition-transform hover:scale-[1.02] shrink-0">
          <Plus className="w-4 h-4 mr-1 shrink-0" /> <span className="truncate">Add new</span>
        </Button>

        <button
          onClick={() => { setPaletteOpen(true); setSidebarOpen(false); }}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm border border-border bg-muted/40 hover:bg-muted text-muted-foreground transition shrink-0 min-w-0"
        >
          <span className="flex items-center gap-2 min-w-0">
            <CommandIcon className="w-4 h-4 shrink-0" /> 
            <span className="truncate">Quick search</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono shrink-0">⌘K</kbd>
        </button>

        <nav className="space-y-1 shrink-0 w-full">
        <SideItem icon={LayoutGrid} label="All items" count={counts.all}
          active={filter === "all" && !activeTag}
          onClick={() => { setFilter("all"); setActiveTag(null); setActiveCollection(null); setSidebarOpen(false); }} />
        <SideItem icon={Link2} label="Links" count={counts.link}
          active={filter === "link"}
          onClick={() => { setFilter("link"); setActiveTag(null); setActiveCollection(null); setSidebarOpen(false); }} />
        <SideItem icon={FileText} label="Notes" count={counts.note}
          active={filter === "note"}
          onClick={() => { setFilter("note"); setActiveTag(null); setActiveCollection(null); setSidebarOpen(false); }} />
        <SideItem icon={Lightbulb} label="Ideas" count={counts.idea}
          active={filter === "idea"}
          onClick={() => { setFilter("idea"); setActiveTag(null); setActiveCollection(null); setSidebarOpen(false); }} />
        <SideItem icon={Pin} label="Pinned" count={counts.pinned}
          active={filter === "pinned"}
          onClick={() => { setFilter("pinned"); setActiveTag(null); setActiveCollection(null); setSidebarOpen(false); }} />
        <SideItem icon={Trash2} label="Trash" count={counts.trash}
          active={filter === "trash"}
          onClick={() => { setFilter("trash"); setActiveTag(null); setActiveCollection(null); setSidebarOpen(false); }} />
      </nav>

      <Collapsible open={collectionsOpen} onOpenChange={setCollectionsOpen} className="shrink-0 w-full">
        <div className="flex items-center justify-between px-3 mb-2 gap-2 min-w-0">
          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition min-w-0">
            {collectionsOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
            <FolderOpen className="w-3 h-3 shrink-0" /> 
            <span className="truncate">Collections</span>
          </CollapsibleTrigger>
          <button onClick={() => { setEditingCollection(null); setCollectionOpen(true); }}
            className="text-muted-foreground hover:text-primary transition shrink-0" aria-label="New collection">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <CollapsibleContent className="w-full">
          {collections.length === 0 ? (
            <p className="px-3 text-xs text-muted-foreground">No collections yet</p>
          ) : (
            <div className="space-y-0.5 w-full">
              {collections.map((c) => (
                <div key={c.id} className="group/col flex items-center min-w-0 w-full gap-1">
                  <button
                    onClick={() => { setFilter("collection"); setActiveCollection(c.id); setActiveTag(null); setSidebarOpen(false); }}
                    className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors min-w-0 ${
                      filter === "collection" && activeCollection === c.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate min-w-0 flex-1">
                      <span className="text-base leading-none shrink-0">{c.emoji || "📁"}</span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{collectionCounts.get(c.id) ?? 0}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover/col:opacity-100 p-1 text-muted-foreground hover:text-foreground shrink-0" aria-label="Collection options">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingCollection(c); setCollectionOpen(true); }}>Rename</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={async () => {
                        try {
                          await api.deleteCollection(c.id);
                          setCollections((prev) => prev.filter((x) => x.id !== c.id));
                          setItems((prev) => prev.map((i) => i.collectionId === c.id ? { ...i, collectionId: null } : i));
                          if (activeCollection === c.id) { setFilter("all"); setActiveCollection(null); }
                          toast.success("Collection deleted");
                        } catch (error) {
                          console.error('Failed to delete collection:', error);
                          toast.error('Failed to delete collection');
                        }
                      }}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={tagsOpen} onOpenChange={setTagsOpen} className="flex-1 min-h-0 overflow-hidden w-full">
        <CollapsibleTrigger className="flex items-center gap-2 px-3 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition min-w-0">
          {tagsOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
          <TagIcon className="w-3 h-3 shrink-0" /> 
          <span className="truncate">Tags</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-y-auto max-h-full w-full">
          {tags.length === 0 ? (
            <p className="px-3 text-xs text-muted-foreground">No tags yet</p>
          ) : (
            <div className="space-y-0.5 w-full">
              {tags.map(([t, c]) => (
                <button
                  key={t}
                  onClick={() => { setActiveTag(activeTag === t ? null : t); setSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors min-w-0 ${
                    activeTag === t ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate min-w-0 flex-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tagColor(t)}`} />
                    <span className="truncate">{t}</span>
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{c}</span>
                </button>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <div className="pt-4 border-t border-border space-y-1 shrink-0">
        {isConfigured && (
          <button onClick={() => { setKbChatOpen(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted text-foreground/80 transition">
            <Sparkles className="w-4 h-4 text-primary" /> Ask AI
          </button>
        )}
        <button onClick={() => exportItems(items, collections)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted text-foreground/80 transition">
          <Download className="w-4 h-4" /> Export JSON
        </button>
        <button onClick={importJson}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted text-foreground/80 transition">
          <Upload className="w-4 h-4" /> Import JSON
        </button>
        <button onClick={() => setBookmarkletOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted text-foreground/80 transition">
          <Bookmark className="w-4 h-4" /> Bookmarklet
        </button>
        <button onClick={() => setShortcutsOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted text-foreground/80 transition">
          <Keyboard className="w-4 h-4" /> Shortcuts
        </button>
      </div>
      </div>
    </aside>
  );

  const activeCol = collections.find((c) => c.id === activeCollection);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your stash...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <input ref={fileRef} type="file" accept="application/json" onChange={onFile} className="hidden" />

      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" className="lg:hidden rounded-xl" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </Button>
          <Logo to="/app" />
          <div className="flex-1 max-w-2xl mx-auto relative hidden sm:block">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-search
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your stash…  ( press / )"
              className="pl-11 pr-32 rounded-full bg-muted/60 border-transparent focus-visible:bg-card h-11"
            />
            {isConfigured && (
              <button
                onClick={() => setSmartSearchEnabled((s) => !s)}
                className={`absolute right-[4.5rem] top-1/2 -translate-y-1/2 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  smartSearchEnabled
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
                title={smartSearchEnabled ? "Smart search ON" : "Smart search OFF"}
              >
                {smartSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : "✨ AI"}
              </button>
            )}
            <button
              onClick={() => setPaletteOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-background border text-[10px] font-mono text-muted-foreground hover:text-foreground hidden md:block"
            >⌘K</button>
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="rounded-full w-[130px] h-11 hidden sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">A → Z</SelectItem>
              <SelectItem value="type">By type</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden sm:flex items-center gap-3">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: user?.profile_color || '#FFF0F3', color: '#1A2B3C' }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user?.name}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="sm:hidden flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: user?.profile_color || '#FFF0F3', color: '#1A2B3C' }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user?.name}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="container pb-3 sm:hidden space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input data-search value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your stash…"
              className="pl-11 rounded-full bg-muted/60 border-transparent h-11" />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="rounded-full w-full h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">A → Z</SelectItem>
              <SelectItem value="type">By type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="container py-8 grid lg:grid-cols-[280px_1fr] gap-8">
        <div className="hidden lg:block w-full max-w-[280px]">{sidebar}</div>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            >
              <motion.div
                initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background p-5 overflow-y-auto sidebar-scroll"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <Logo to="/app" />
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                {sidebar}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <main>
          <motion.div
            key={`${filter}-${activeTag}-${activeCollection}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-5 flex items-center gap-3 flex-wrap">
              {filter === "collection" && activeCol && (
                <h2 className="font-display text-2xl text-secondary flex items-center gap-2">
                  <span>{activeCol.emoji || "📁"}</span> {activeCol.name}
                </h2>
              )}
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="px-3 py-1 rounded-full bg-accent text-accent-foreground inline-flex items-center gap-1.5 hover:opacity-80 text-sm"
                >
                  #{activeTag} <X className="w-3 h-3" />
                </button>
              )}
              {query && (
                <span className="text-sm text-muted-foreground">
                  Showing {filtered.length} of {filter === "trash" ? trashed.length : live.length}
                </span>
              )}
              {filter === "trash" && trashed.length > 0 && (
                <Button onClick={emptyTrash} variant="ghost" size="sm"
                  className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Empty trash
                </Button>
              )}
            </div>

            {filtered.length === 0 ? (
              <EmptyState onAdd={() => openAdd("link")} hasItems={live.length > 0} trash={filter === "trash"} />
            ) : (
              <>
                {pinnedSection.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Pin className="w-3 h-3 fill-current text-primary" /> Pinned
                    </div>
                    <div className="masonry mb-8">
                      <AnimatePresence>
                        {pinnedSection.map((item, i) => (
                          <StashCard key={item.id} item={item} index={i}
                            onDelete={softDelete} onPin={togglePin} onEdit={openEdit} onEnlarge={openEnlarged} onChat={isConfigured ? openItemChat : undefined} />
                        ))}
                      </AnimatePresence>
                    </div>
                  </>
                )}
                {restSection.length > 0 && (
                  <>
                    {pinnedSection.length > 0 && (
                      <div className="flex items-center gap-2 mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Sparkles className="w-3 h-3" /> Everything else
                      </div>
                    )}
                    <div className="masonry">
                      <AnimatePresence>
                        {restSection.map((item, i) => (
                          <StashCard key={item.id} item={item} index={i}
                            onDelete={softDelete}
                            onPin={filter === "trash" ? undefined : togglePin}
                            onEdit={filter === "trash" ? undefined : openEdit}
                            onEnlarge={filter === "trash" ? undefined : openEnlarged}
                            onChat={filter === "trash" || !isConfigured ? undefined : openItemChat}
                            onRestore={restore}
                            onPurge={purge}
                            trash={filter === "trash"}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        </main>
      </div>

      <button
        onClick={() => openAdd("link")}
        className="lg:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-pink flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        aria-label="Add new"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddItemDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
        onAdd={addItem}
        onUpdate={updateItem}
        editing={editing}
        initialUrl={initialUrl}
        initialTab={initialTab}
        collections={collections}
        allItems={items}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={items}
        collections={collections}
        onAction={handlePalette}
        isDark={theme === "dark"}
      />

      <CollectionDialog
        open={collectionOpen}
        onOpenChange={(o) => { setCollectionOpen(o); if (!o) setEditingCollection(null); }}
        onCreate={(c) => setCollections((prev) => [...prev, c])}
        editing={editingCollection}
        onUpdate={(c) => setCollections((prev) => prev.map((x) => x.id === c.id ? c : x))}
      />

      <BookmarkletDialog open={bookmarkletOpen} onOpenChange={setBookmarkletOpen} />

      <EnlargedViewDialog
        item={enlargedItem}
        open={enlargedOpen}
        onOpenChange={setEnlargedOpen}
        onEdit={openEdit}
        onPin={togglePin}
        onDelete={softDelete}
      />

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-secondary">Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { keys: ["⌘", "K"], label: "Open command palette" },
              { keys: ["⌘", "⇧", "K"], label: "Ask AI (Knowledge Base)" },
              { keys: ["/"], label: "Focus search" },
              { keys: ["⌘", "V"], label: "Save link from clipboard" },
              { keys: ["⌘", "N"], label: "New note" },
              { keys: ["Esc"], label: "Close dialog / sidebar" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-sm text-foreground/80">{s.label}</span>
                <span className="flex gap-1">
                  {s.keys.map((k) => (
                    <kbd key={k} className="px-2 py-0.5 rounded-md border bg-muted text-xs font-mono">{k}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Chat Dialogs */}
      <AIChatDialog
        mode="kb"
        items={items}
        open={kbChatOpen}
        onOpenChange={setKbChatOpen}
        onOpenAISettings={() => setAiSettingsOpen(true)}
      />
      
      {chatItem && (
        <AIChatDialog
          mode="item"
          item={chatItem}
          open={itemChatOpen}
          onOpenChange={setItemChatOpen}
          onOpenAISettings={() => setAiSettingsOpen(true)}
        />
      )}
      
      <AISettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />
    </div>
  );
};

const SideItem = ({
  icon: Icon, label, count, active, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; count: number; active?: boolean; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
      active ? "bg-accent text-accent-foreground font-medium scale-[1.02]" : "hover:bg-muted text-foreground/80"
    }`}
  >
    <span className="flex items-center gap-2.5">
      <Icon className="w-4 h-4" />
      {label}
    </span>
    <span className="text-xs text-muted-foreground">{count}</span>
  </button>
);

const EmptyState = ({ onAdd, hasItems, trash }: { onAdd: () => void; hasItems: boolean; trash?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
    className="text-center py-24 px-6"
  >
    <div className="w-20 h-20 mx-auto rounded-3xl gradient-warm flex items-center justify-center mb-6 animate-float">
      <Inbox className="w-9 h-9 text-primary" />
    </div>
    <h2 className="font-display text-3xl text-secondary mb-2">
      {trash ? "Trash is empty" : hasItems ? "Nothing matches" : "Your stash awaits"}
    </h2>
    <p className="text-muted-foreground max-w-sm mx-auto mb-6">
      {trash ? "Deleted items will appear here."
        : hasItems ? "Try a different search or clear your filters."
        : "Paste any link or write a note to get started. Everything stays in your browser."}
    </p>
    {!hasItems && !trash && (
      <Button onClick={onAdd} className="rounded-full gradient-primary text-primary-foreground shadow-pink hover:opacity-95 h-11 px-6">
        <Plus className="w-4 h-4 mr-1" /> Save your first thing
      </Button>
    )}
  </motion.div>
);

export default StashApp;
