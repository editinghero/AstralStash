import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { ExternalLink, Trash2, FileText, Lightbulb, Pin, RotateCcw, Pencil, Maximize2 } from "lucide-react";
import { StashItem, domainOf } from "@/lib/stash";
import { Button } from "@/components/ui/button";

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// deterministic pastel for link cards without an image
const PLACEHOLDERS = ["#FFD6D6", "#D6E4FF", "#D6FFE4", "#FFF1B3", "#E8D6FF", "#FFE0C2"];
const placeholderFor = (s: string) => {
  const h = [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
  return PLACEHOLDERS[h % PLACEHOLDERS.length];
};

type Props = {
  item: StashItem;
  onDelete: (id: string) => void;
  onPin?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPurge?: (id: string) => void;
  onEdit?: (item: StashItem) => void;
  onEnlarge?: (item: StashItem) => void;
  trash?: boolean;
  index?: number;
};

export const StashCard = ({ item, onDelete, onPin, onRestore, onPurge, onEdit, onEnlarge, trash, index = 0 }: Props) => {
  const isLink = item.type === "link";
  const isIdea = item.type === "idea";
  const isNote = item.type === "note";

  // Pastel cards keep a fixed dark ink in both themes since their background stays light
  const pastelInk = "#1A2B3C";
  
  // Links use color when no image, notes/ideas always use color
  const hasCustomBg = !isLink || (isLink && !item.image && item.color);
  const cardStyle = hasCustomBg
    ? { backgroundColor: item.color || "#FFF0F3", color: pastelInk }
    : undefined;
  const cardClass = !hasCustomBg ? "bg-card" : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="group relative break-inside-avoid"
    >
      {item.pinned && !trash && (
        <div className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-pink">
          <Pin className="w-3.5 h-3.5 fill-current" />
        </div>
      )}

      <article
        style={cardStyle}
        className={`${cardClass} rounded-3xl overflow-hidden shadow-card hover-lift transition-transform`}
      >
        {isLink && (
          <a href={item.url} target="_blank" rel="noreferrer" className="block">
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className="w-full h-40 object-cover"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const sib = el.nextElementSibling as HTMLElement | null;
                  if (sib) sib.style.display = "flex";
                }}
              />
            ) : null}
            {!item.image && (
              <div
                className="w-full h-40 flex items-center justify-center font-display text-2xl"
                style={{ background: item.color || placeholderFor(item.title), color: pastelInk + "66" }}
              >
                {domainOf(item.url || "").charAt(0).toUpperCase()}
              </div>
            )}
          </a>
        )}

        <div className={isLink ? "p-5" : "p-6"}>
          {(isNote || isIdea) && (
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/60 backdrop-blur" style={{ color: pastelInk }}>
                {isNote ? <FileText className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                {isNote ? "Note" : "Idea"}
              </span>
            </div>
          )}

          {isLink && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              {item.favicon && <img src={item.favicon} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0" />}
              <span className="truncate min-w-0">{item.url ? domainOf(item.url) : ""}</span>
            </div>
          )}

          {!(isIdea && !item.title) && (
            <h3
              className={`font-display font-semibold leading-snug break-words ${
                isLink ? "text-lg" : "text-xl"
              }`}
              style={hasCustomBg ? { color: pastelInk } : { color: "hsl(var(--secondary))" }}
            >
              {isLink && item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors break-words">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </h3>
          )}

          {isLink && item.description && (
            <p className="mt-2 text-sm line-clamp-3 break-words" style={hasCustomBg ? { color: `${pastelInk}cc` } : { color: "hsl(var(--muted-foreground))" }}>{item.description}</p>
          )}

          {(isNote || isIdea) && item.content && (
            <div
              className={`${isIdea ? "mt-2 text-base" : "mt-3 text-sm"} line-clamp-6 prose prose-sm max-w-none prose-headings:font-display prose-p:my-1 prose-a:text-primary break-words`}
              style={{ color: `${pastelInk}cc` }}
            >
              {isNote && item.format === "txt" ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{item.content}</pre>
              ) : (
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{item.content}</ReactMarkdown>
              )}
            </div>
          )}

          <div className="mt-4 flex items-end justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium backdrop-blur ${hasCustomBg ? "bg-white/60" : "bg-accent text-accent-foreground"}`}
                  style={hasCustomBg ? { color: pastelInk } : undefined}
                >
                  #{t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="text-[11px] text-muted-foreground mr-1">{formatDate(item.createdAt)}</span>
              {trash ? (
                <>
                  <Button size="icon" variant="ghost" onClick={() => onRestore?.(item.id)} className="h-8 w-8 hover:text-primary" aria-label="Restore">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onPurge?.(item.id)} className="h-8 w-8 hover:text-destructive" aria-label="Delete forever">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  {onPin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onPin(item.id)}
                      className={`h-8 w-8 transition-opacity ${item.pinned ? "text-primary" : "opacity-0 group-hover:opacity-100"}`}
                      aria-label={item.pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className={`w-3.5 h-3.5 ${item.pinned ? "fill-current" : ""}`} />
                    </Button>
                  )}
                  {(isNote || isIdea) && onEnlarge && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => onEnlarge(item)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary" 
                      aria-label="Enlarge">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button size="icon" variant="ghost" onClick={() => onEdit(item)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {isLink && item.url && (
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={item.url} target="_blank" rel="noreferrer" aria-label="Open">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(item.id)}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    </motion.div>
  );
};
