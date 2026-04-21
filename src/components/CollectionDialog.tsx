import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collection } from "@/lib/stash";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (c: Collection) => void;
  editing?: Collection | null;
  onUpdate?: (c: Collection) => void;
};

export const CollectionDialog = ({ open, onOpenChange, onCreate, editing, onUpdate }: Props) => {
  const [name, setName] = useState(editing?.name ?? "");
  const [emoji, setEmoji] = useState(editing?.emoji ?? "📁");
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(editing?.name ?? ""); setEmoji(editing?.emoji ?? "📁"); };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    setSaving(true);
    try {
      if (editing && onUpdate) {
        const { collection } = await api.updateCollection(editing.id, { name: trimmed, emoji });
        onUpdate(collection);
        toast.success("Collection updated");
      } else {
        const { collection } = await api.createCollection(trimmed, emoji);
        onCreate(collection);
        toast.success("Collection created");
      }
      onOpenChange(false);
      setName(""); setEmoji("📁");
    } catch (error) {
      console.error('Failed to save collection:', error);
      toast.error('Failed to save collection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-secondary">
            {editing ? "Rename collection" : "New collection"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} className="w-16 rounded-xl text-center text-xl" />
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !saving) save(); }}
              placeholder="Collection name" className="rounded-xl" disabled={saving} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl" disabled={saving}>Cancel</Button>
          <Button onClick={save} className="rounded-xl gradient-primary text-primary-foreground shadow-pink hover:opacity-95" disabled={saving}>
            {saving ? "Saving..." : editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
