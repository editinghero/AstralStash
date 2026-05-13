import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowLeft, FolderOpen, Tag as TagIcon, Hash, Inbox } from "lucide-react";
import { StashItem, Collection } from "@/lib/stash";
import { StashCard } from "./StashCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type PopupState =
  | { type: 'collection'; id: string }
  | { type: 'tag'; name: string }
  | { type: 'folders-overview' }
  | { type: 'tags-overview' };

interface PopupSheetProps {
  initialState: PopupState | null;
  onOpenChange: (open: boolean) => void;
  items: StashItem[];
  collections: Collection[];
  onItemEdit: (item: StashItem) => void;
  onItemPin: (id: string) => void;
  onItemDelete: (id: string) => void;
  onItemEnlarge: (item: StashItem) => void;
  onItemChat?: (item: StashItem) => void;
  onAddToCollection?: (collectionId: string) => void;
}

const TAG_COLORS = [
  "bg-rose-300", "bg-amber-300", "bg-emerald-300",
  "bg-sky-300", "bg-violet-300", "bg-orange-300",
];
const tagColor = (t: string) =>
  TAG_COLORS[Math.abs([...t].reduce((a, c) => a + c.charCodeAt(0), 0)) % TAG_COLORS.length];

export const PopupSheet: React.FC<PopupSheetProps> = ({
  initialState,
  onOpenChange,
  items,
  collections,
  onItemEdit,
  onItemPin,
  onItemDelete,
  onItemEnlarge,
  onItemChat,
  onAddToCollection,
}) => {
  const [stack, setStack] = useState<PopupState[]>([]);

  useEffect(() => {
    if (initialState) {
      setStack([initialState]);
    } else {
      setStack([]);
    }
  }, [initialState]);

  const currentState = stack[stack.length - 1];

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleBack = () => {
    setStack((prev) => prev.slice(0, -1));
  };

  const pushState = (state: PopupState) => {
    setStack((prev) => [...prev, state]);
  };

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack.length > 0) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stack.length]);

  if (!currentState) return null;

  return (
    <AnimatePresence>
      {stack.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ perspective: '1200px' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            className="relative bg-background w-full max-w-[860px] h-[85vh] rounded-[20px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border z-10 bg-background/95 backdrop-blur">
              <div className="flex items-center gap-3">
                {stack.length > 1 && (
                  <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors" aria-label="Go back">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <HeaderTitle state={currentState} collections={collections} />
              </div>
              <button onClick={handleClose} className="p-2 -mr-2 rounded-full hover:bg-muted text-muted-foreground transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={stack.length + "-" + (currentState.type === 'collection' ? currentState.id : currentState.type === 'tag' ? currentState.name : currentState.type)}
                  initial={{ x: stack.length > 1 ? 40 : 0, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="p-6 h-full"
                >
                  <SheetContent
                    state={currentState}
                    pushState={pushState}
                    items={items}
                    collections={collections}
                    onItemEdit={onItemEdit}
                    onItemPin={onItemPin}
                    onItemDelete={onItemDelete}
                    onItemEnlarge={onItemEnlarge}
                    onItemChat={onItemChat}
                    onAddToCollection={onAddToCollection}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const HeaderTitle = ({ state, collections }: { state: PopupState, collections: Collection[] }) => {
  if (state.type === 'folders-overview') {
    return <h2 className="font-display text-xl flex items-center gap-2"><FolderOpen className="w-5 h-5" /> All Folders</h2>;
  }
  if (state.type === 'tags-overview') {
    return <h2 className="font-display text-xl flex items-center gap-2"><TagIcon className="w-5 h-5" /> All Tags</h2>;
  }
  if (state.type === 'collection') {
    const col = collections.find(c => c.id === state.id);
    return <h2 className="font-display text-xl flex items-center gap-2">{col?.emoji || "📁"} {col?.name || "Folder"}</h2>;
  }
  if (state.type === 'tag') {
    return <h2 className="font-display text-xl flex items-center gap-2"><Hash className="w-5 h-5" /> {state.name}</h2>;
  }
  return null;
};

interface SheetContentProps {
  state: PopupState;
  pushState: (s: PopupState) => void;
  items: StashItem[];
  collections: Collection[];
  onItemEdit: (item: StashItem) => void;
  onItemPin: (id: string) => void;
  onItemDelete: (id: string) => void;
  onItemEnlarge: (item: StashItem) => void;
  onItemChat?: (item: StashItem) => void;
  onAddToCollection?: (collectionId: string) => void;
}

const SheetContent: React.FC<SheetContentProps> = (props) => {
  const { state } = props;

  if (state.type === 'folders-overview') return <FoldersOverview {...props} />;
  if (state.type === 'tags-overview') return <TagsOverview {...props} />;
  if (state.type === 'collection') return <CollectionFolder {...props} />;
  if (state.type === 'tag') return <TagPage {...props} />;

  return null;
};

// ==========================================
// FEATURE 1: Collection Folder Page
// ==========================================
const CollectionFolder: React.FC<SheetContentProps> = ({ state, items, onAddToCollection, onItemDelete, onItemEdit, onItemEnlarge, onItemPin, onItemChat }) => {
  const isCol = state.type === 'collection';
  const stateId = state.type === 'collection' ? state.id : '';
  const colItems = useMemo(() => {
    if (!isCol) return [];
    return items.filter(i => !i.deleted && i.collectionId === stateId);
  }, [items, isCol, stateId]);

  if (!isCol) return null;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{colItems.length} items</div>
        {onAddToCollection && (
          <Button onClick={() => onAddToCollection(state.id)} size="sm" className="rounded-full">
            + Add to collection
          </Button>
        )}
      </div>

      {colItems.length === 0 ? (
        <EmptyState message="No items in this collection yet" />
      ) : (
        <div className="masonry pb-8">
          {colItems.map((item, i) => (
            <StashCard key={item.id} item={item} index={i} onDelete={onItemDelete} onPin={onItemPin} onEdit={onItemEdit} onEnlarge={onItemEnlarge} onChat={onItemChat} />
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// FEATURE 2: Tag Page
// ==========================================
const TagPage: React.FC<SheetContentProps> = ({ state, items, collections, onItemDelete, onItemEdit, onItemEnlarge, onItemPin, onItemChat }) => {
  const isTag = state.type === 'tag';
  const tagName = state.type === 'tag' ? state.name : '';

  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "titleAsc" | "titleDesc">("newest");
  const [filterCol, setFilterCol] = useState<string>("all");

  const tagItems = useMemo(() => {
    if (!isTag) return [];
    let list = items.filter(i => !i.deleted && i.tags.includes(tagName));

    if (filterCol !== "all") {
      list = list.filter(i => i.collectionId === filterCol);
    }

    return list.sort((a, b) => {
      if (sortBy === "newest") return b.createdAt - a.createdAt;
      if (sortBy === "oldest") return a.createdAt - b.createdAt;
      if (sortBy === "titleAsc") return a.title.localeCompare(b.title);
      if (sortBy === "titleDesc") return b.title.localeCompare(a.title);
      return 0;
    });
  }, [items, isTag, tagName, filterCol, sortBy]);

  if (!isTag) return null;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 p-3 rounded-xl border border-border">
        <div className="text-sm font-medium">{tagItems.length} items</div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={filterCol} onValueChange={setFilterCol}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All collections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All collections</SelectItem>
              {collections.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "oldest" | "titleAsc" | "titleDesc")}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="titleAsc">Name (A→Z)</SelectItem>
              <SelectItem value="titleDesc">Name (Z→A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {tagItems.length === 0 ? (
        <EmptyState message="No items match these filters" />
      ) : (
        <div className="masonry pb-8">
          {tagItems.map((item, i) => (
            <StashCard key={item.id} item={item} index={i} onDelete={onItemDelete} onPin={onItemPin} onEdit={onItemEdit} onEnlarge={onItemEnlarge} onChat={onItemChat} />
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// FEATURE 3: Folders Overview Page
// ==========================================
const FoldersOverview: React.FC<SheetContentProps> = ({ collections, items, pushState }) => {
  const [sortBy, setSortBy] = useState<"name" | "date" | "count">("name");

  const sortedCols = useMemo(() => {
    const colCounts = new Map<string, number>();
    items.forEach(i => { if (!i.deleted && i.collectionId) colCounts.set(i.collectionId, (colCounts.get(i.collectionId) || 0) + 1); });

    return [...collections].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date") return b.createdAt - a.createdAt;
      if (sortBy === "count") return (colCounts.get(b.id) || 0) - (colCounts.get(a.id) || 0);
      return 0;
    }).map(c => ({ ...c, count: colCounts.get(c.id) || 0 }));
  }, [collections, items, sortBy]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center bg-muted/30 p-3 rounded-xl border border-border">
        <span className="text-sm font-medium">{sortedCols.length} folders</span>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "date" | "count")}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A→Z)</SelectItem>
            <SelectItem value="date">Date created</SelectItem>
            <SelectItem value="count">Item count</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sortedCols.length === 0 ? (
        <EmptyState message="No folders created yet" />
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-8"
          initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        >
          {sortedCols.map(c => (
            <motion.button
              key={c.id}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => pushState({ type: 'collection', id: c.id })}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors text-left shadow-sm"
            >
              <div className="text-3xl shrink-0">{c.emoji || "📁"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.name}</div>
                <div className="text-sm text-muted-foreground">{c.count} items</div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ==========================================
// FEATURE 4: Tags Overview Page
// ==========================================
const TagsOverview: React.FC<SheetContentProps> = ({ items, pushState }) => {
  const [sortBy, setSortBy] = useState<"name" | "count">("count");

  const tagData = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(i => {
      if (!i.deleted) {
        i.tags.forEach(t => map.set(t, (map.get(t) || 0) + 1));
      }
    });

    return [...map.entries()].sort((a, b) => {
      if (sortBy === "count") return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    }).map(([name, count]) => ({ name, count }));
  }, [items, sortBy]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center bg-muted/30 p-3 rounded-xl border border-border">
        <span className="text-sm font-medium">{tagData.length} tags</span>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "count")}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count">Amount</SelectItem>
            <SelectItem value="name">Name (A→Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tagData.length === 0 ? (
        <EmptyState message="No tags used yet" />
      ) : (
        <motion.div
          className="flex flex-wrap gap-3 pb-8"
          initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.03 } } }}
        >
          {tagData.map(t => (
            <motion.button
              key={t.name}
              variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => pushState({ type: 'tag', name: t.name })}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-muted transition-colors shadow-sm"
            >
              <div className={`w-3 h-3 rounded-full ${tagColor(t.name)}`} />
              <span className="font-medium">{t.name}</span>
              <span className="text-muted-foreground text-sm ml-1">{t.count}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// Shared Empty State
const EmptyState = ({ message }: { message: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60"
  >
    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
      <Inbox className="w-8 h-8 text-muted-foreground" />
    </div>
    <p className="text-muted-foreground font-medium">{message}</p>
  </motion.div>
);
