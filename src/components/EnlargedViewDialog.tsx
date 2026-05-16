import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Pencil, Pin, Trash2 } from "lucide-react";
import { StashItem } from "@/lib/stash";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
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
        className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-3xl enlarged-dialog-scroll [&>button]:hidden"
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
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-9 w-9 rounded-full hover:bg-white/60"
                style={{ color: pastelInk }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
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
              className="max-w-none break-words"
              style={{ color: `${pastelInk}dd` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {isNote && item.format === "txt" ? (
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">{item.content}</pre>
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkBreaks]} 
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 mt-4 first:mt-0 font-display">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold mb-2.5 mt-3 first:mt-0 font-display">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-2.5 first:mt-0 font-display">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-base font-semibold mb-1.5 mt-2 first:mt-0">{children}</h4>,
                    p: ({ children }) => <p className="my-3">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    code: ({ className, children, ...props }) => {
                      const isBlock = className?.includes("language-");
                      if (isBlock) {
                        return (
                          <div className="my-3 rounded-lg overflow-x-auto bg-white/60 border border-white/40">
                            <pre className="p-3 text-sm"><code className={className} {...props}>{children}</code></pre>
                          </div>
                        );
                      }
                      return <code className="px-1.5 py-0.5 rounded bg-white/60 text-sm font-mono" {...props}>{children}</code>;
                    },
                    pre: ({ children }) => <>{children}</>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 transition-colors">{children}</a>,
                    img: ({ src, alt }) => <img src={src} alt={alt} className="max-w-full h-auto rounded-lg border border-white/40 my-3" />,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-white/40 pl-4 my-3 italic opacity-80">{children}</blockquote>,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2 rounded-lg border border-gray-400">
                        <table className="min-w-full text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-white/40">{children}</thead>,
                    tbody: ({ children }) => <tbody>{children}</tbody>,
                    tr: ({ children }) => <tr className="border-b border-gray-500 last:border-0">{children}</tr>,
                    th: ({ children }) => <th className="px-3 py-2 text-left font-semibold border-b border-gray-400 border-r border-gray-400 last:border-r-0">{children}</th>,
                    td: ({ children }) => <td className="px-3 py-2 border-r border-gray-400 last:border-r-0">{children}</td>,
                    hr: () => <hr className="my-4 border-white/30" />,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
                    input: ({ type, checked, ...props }) => {
                      if (type === 'checkbox') {
                        return <input type="checkbox" checked={checked} disabled className="mr-1.5 align-middle cursor-not-allowed" {...props} />;
                      }
                      return <input type={type} {...props} />;
                    },
                  }}
                >
                  {item.content}
                </ReactMarkdown>
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
