import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bookmark, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const BookmarkletDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const code = `javascript:(function(){var u=encodeURIComponent(location.href);var t=encodeURIComponent(document.title);window.open('${origin}/app?save='+u+'&title='+t,'_blank');})();`;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-secondary">Save from anywhere</DialogTitle>
          <DialogDescription>
            Drag the button below to your browser's bookmarks bar. Click it on any page to save it to AstralStash.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <a
            href={code}
            onClick={(e) => e.preventDefault()}
            draggable
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full gradient-primary text-primary-foreground shadow-pink font-medium cursor-grab active:cursor-grabbing hover:opacity-95 transition"
          >
            <Bookmark className="w-4 h-4 fill-current" /> Save to AstralStash
          </a>
        </div>
        <div className="rounded-xl border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground mb-2">Or copy the code manually:</p>
          <div className="flex gap-2">
            <code className="flex-1 text-[10px] font-mono break-all bg-background rounded p-2 max-h-24 overflow-auto">{code}</code>
            <Button size="icon" variant="secondary" onClick={copy} className="rounded-lg shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
