import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Pencil, Pin, Trash2 } from "lucide-react";
import { StashItem } from "@/lib/stash";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  item: StashItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (item: StashItem) => void;
  onPin?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export const EnlargedViewDialog = ({ item, open, onOpenChange, onEdit, onPin, onDelete }: Props) => {
  if (!item) return null;

  const isNote = item.type === "note";
  const isIdea = item.type === "idea";
  const pastelInk = "#1A2B3C";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-3xl enlarged-dialog-scroll"
        style={{ backgroundColor: item.color || "#FFF0F3" }}
      >
        <motion.div 
          className="p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header with type badge */}
          <motion.div 
            className="flex items-center justify-between mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <span 
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-white/60 backdrop-blur"
              style={{ color: pastelInk }}
            >
              {isNote ? "Note" : "Idea"}
            </span>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {onPin && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onPin(item.id)}
                  className={`h-9 w-9 rounded-full hover:bg-white/60 ${item.pinned ? "text-primary" : ""}`}
                  style={{ color: item.pinned ? undefined : pastelInk }}
                  aria-label={item.pinned ? "Unpin" : "Pin"}
                >
                  <Pin className={`w-4 h-4 ${item.pinned ? "fill-current" : ""}`} />
                </Button>
              )}
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    onEdit(item);
                    onOpenChange(false);
                  }}
                  className="h-9 w-9 rounded-full hover:bg-white/60"
                  style={{ color: pastelInk }}
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    onDelete(item.id);
                    onOpenChange(false);
                  }}
                  className="h-9 w-9 rounded-full hover:bg-white/60 hover:text-destructive"
                  style={{ color: pastelInk }}
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>

          {/* Title */}
          {item.title && (
            <motion.h2 
              className="font-display font-semibold text-3xl leading-tight mb-6 break-words"
              style={{ color: pastelInk }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {item.title}
            </motion.h2>
          )}

          {/* Content */}
          {item.content && (
            <motion.div 
              className="prose prose-lg max-w-none prose-headings:font-display prose-p:my-3 prose-a:text-primary break-words"
              style={{ color: `${pastelInk}dd` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {isNote && item.format === "txt" ? (
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">{item.content}</pre>
              ) : (
                <ReactMarkdown>{item.content}</ReactMarkdown>
              )}
            </motion.div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <motion.div 
              className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-white/60 backdrop-blur"
                  style={{ color: pastelInk }}
                >
                  #{tag}
                </span>
              ))}
            </motion.div>
          )}

          {/* Date */}
          <motion.div 
            className="mt-4 text-sm opacity-60" 
            style={{ color: pastelInk }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            Created {new Date(item.createdAt).toLocaleDateString(undefined, { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
