import { useEffect, useState } from "react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Link2, FileText, Lightbulb, Inbox, Pin, Trash2, Sun, Moon, Download, Upload, FolderOpen, Search } from "lucide-react";
import { StashItem, Collection } from "@/lib/stash";

type Action =
  | { kind: "new"; type: "link" | "note" | "idea" }
  | { kind: "filter"; value: "all" | "link" | "note" | "idea" | "pinned" | "trash" }
  | { kind: "collection"; id: string }
  | { kind: "open"; item: StashItem }
  | { kind: "theme" }
  | { kind: "export" }
  | { kind: "import" };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: StashItem[];
  collections: Collection[];
  onAction: (a: Action) => void;
  isDark: boolean;
};

export const CommandPalette = ({ open, onOpenChange, items, collections, onAction, isDark }: Props) => {
  const [q, setQ] = useState("");
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const live = items.filter((i) => !i.deleted).slice(0, 8);

  const run = (a: Action) => { onAction(a); onOpenChange(false); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter>
        <CommandInput value={q} onValueChange={setQ} placeholder="Search items, collections, or run a command…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Create">
            <CommandItem onSelect={() => run({ kind: "new", type: "link" })}>
              <Link2 className="mr-2 h-4 w-4" /> New link
            </CommandItem>
            <CommandItem onSelect={() => run({ kind: "new", type: "note" })}>
              <FileText className="mr-2 h-4 w-4" /> New note
            </CommandItem>
            <CommandItem onSelect={() => run({ kind: "new", type: "idea" })}>
              <Lightbulb className="mr-2 h-4 w-4" /> New idea
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => run({ kind: "filter", value: "all" })}>
              <Inbox className="mr-2 h-4 w-4" /> All items
            </CommandItem>
            <CommandItem onSelect={() => run({ kind: "filter", value: "pinned" })}>
              <Pin className="mr-2 h-4 w-4" /> Pinned
            </CommandItem>
            <CommandItem onSelect={() => run({ kind: "filter", value: "link" })}>
              <Link2 className="mr-2 h-4 w-4" /> Links
            </CommandItem>
            <CommandItem onSelect={() => run({ kind: "filter", value: "note" })}>
              <FileText className="mr-2 h-4 w-4" /> Notes
            </CommandItem>
            <CommandItem onSelect={() => run({ kind: "filter", value: "idea" })}>
              <Lightbulb className="mr-2 h-4 w-4" /> Ideas
            </CommandItem>
            <CommandItem onSelect={() => run({ kind: "filter", value: "trash" })}>
              <Trash2 className="mr-2 h-4 w-4" /> Trash
            </CommandItem>
          </CommandGroup>
          {collections.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Collections">
                {collections.map((c) => (
                  <CommandItem key={c.id} onSelect={() => run({ kind: "collection", id: c.id })}>
                    <FolderOpen className="mr-2 h-4 w-4" /> {c.emoji ? `${c.emoji} ` : ""}{c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {live.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Items">
                {live.map((i) => (
                  <CommandItem key={i.id} value={`${i.title} ${i.tags.join(" ")} ${i.url ?? ""}`} onSelect={() => run({ kind: "open", item: i })}>
                    {i.type === "link" ? <Link2 className="mr-2 h-4 w-4" /> : i.type === "note" ? <FileText className="mr-2 h-4 w-4" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    <span className="truncate">{i.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => run({ kind: "theme" })}>
              {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              Toggle theme
            </CommandItem>
            <CommandItem onSelect={() => run({ kind: "export" })}>
              <Download className="mr-2 h-4 w-4" /> Export JSON
            </CommandItem>
            <CommandItem onSelect={() => run({ kind: "import" })}>
              <Upload className="mr-2 h-4 w-4" /> Import JSON
            </CommandItem>
            <CommandItem disabled>
              <Search className="mr-2 h-4 w-4" /> Press Esc to close
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export type { Action as PaletteAction };
