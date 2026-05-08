export type StashType = "link" | "note" | "idea";

export type StashItem = {
  id: string;
  type: StashType;
  title: string;
  url?: string;
  description?: string;
  image?: string;
  favicon?: string;
  content?: string;
  color?: string;
  format?: "md" | "txt"; // For notes: markdown or plain text
  tags: string[];
  pinned: boolean;
  collectionId?: string | null;
  deleted: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type Collection = {
  id: string;
  name: string;
  emoji?: string;
  createdAt: number;
};

const KEY = "stash_items";
const COLLECTIONS_KEY = "stash_collections";
const VERSION_KEY = "stash_version";
const VERSION = "3";

export const NOTE_COLORS = [
  "#FFF0F3", "#F0F4FF", "#F0FFF4", "#FFFBF0", "#F5F0FF", "#FFF1E6",
  "#DFE7FD", "#E2ECE9", "#EAE4E9", "#BEE1E6",
];

export const randomNoteColor = () =>
  NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];

export function loadItems(): StashItem[] {
  try {
    const v = localStorage.getItem(VERSION_KEY);
    if (v !== VERSION) {
      // migrate from v2 if present
      const raw = localStorage.getItem(KEY);
      localStorage.setItem(VERSION_KEY, VERSION);
      if (!raw) return [];
      const arr = JSON.parse(raw) as StashItem[];
      return arr.map((i) => ({ collectionId: null, ...i }));
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StashItem[];
  } catch {
    return [];
  }
}

export function saveItems(items: StashItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function loadCollections(): Collection[] {
  try {
    const raw = localStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Collection[];
  } catch {
    return [];
  }
}

export function saveCollections(c: Collection[]) {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(c));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

export function faviconFor(url: string) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch { return undefined; }
}

export async function fetchLinkMeta(url: string, signal?: AbortSignal): Promise<Partial<StashItem>> {
  const fallback: Partial<StashItem> = { title: capitalizeFirst(domainOf(url)), url, favicon: faviconFor(url) };

  try {
    // Use AllOrigins as primary method since we don't have a meta endpoint
    const allorigins = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(allorigins, { signal });
    
    if (!res.ok) {
      console.error('AllOrigins fetch failed:', res.status);
      return fallback;
    }
    
    const data = await res.json();
    
    if (!data.contents) {
      console.error('No contents in AllOrigins response');
      return fallback;
    }
    
    return parseMeta(data.contents, url);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching meta:', error);
    return fallback;
  }
}

function parseMeta(html: string, url: string): Partial<StashItem> {
  if (!html) {
    return {
      title: capitalizeFirst(domainOf(url)),
      url,
      favicon: faviconFor(url),
    };
  }

  // Helper to extract content from meta tags
  const pick = (re: RegExp) => {
    const m = html.match(re);
    return m ? m[1].trim() : undefined;
  };

  // Try multiple patterns for title
  const title =
    pick(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
    pick(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:title["']/i) ||
    pick(/<title[^>]*>([^<]+)<\/title>/i) ||
    domainOf(url);

  // Try multiple patterns for description
  const description =
    pick(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i) ||
    pick(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i) ||
    pick(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:description["']/i);

  return {
    title: capitalizeFirst(decodeHtml(title)),
    description: description ? decodeHtml(description) : undefined,
    url,
    favicon: faviconFor(url),
  };
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function decodeHtml(s: string) {
  const t = document.createElement("textarea");
  t.innerHTML = s;
  return t.value;
}

export function exportItems(items: StashItem[], collections: Collection[] = []) {
  const payload = { version: VERSION, exportedAt: Date.now(), items, collections };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stash-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportResult = { added: number; updated: number; collections: number };

export function mergeImport(
  existing: StashItem[],
  existingCollections: Collection[],
  raw: unknown,
): { items: StashItem[]; collections: Collection[]; result: ImportResult } {
  let incomingItems: StashItem[] = [];
  let incomingCollections: Collection[] = [];
  if (Array.isArray(raw)) incomingItems = raw as StashItem[];
  else if (raw && typeof raw === "object") {
    const obj = raw as { items?: StashItem[]; collections?: Collection[] };
    incomingItems = obj.items ?? [];
    incomingCollections = obj.collections ?? [];
  }
  const byId = new Map(existing.map((i) => [i.id, i]));
  let added = 0, updated = 0;
  for (const it of incomingItems) {
    if (!it?.id) continue;
    if (byId.has(it.id)) {
      byId.set(it.id, { ...byId.get(it.id)!, ...it });
      updated++;
    } else {
      byId.set(it.id, it);
      added++;
    }
  }
  const colMap = new Map(existingCollections.map((c) => [c.id, c]));
  let colAdded = 0;
  for (const c of incomingCollections) {
    if (!c?.id) continue;
    if (!colMap.has(c.id)) { colMap.set(c.id, c); colAdded++; }
  }
  return {
    items: [...byId.values()].sort((a, b) => b.createdAt - a.createdAt),
    collections: [...colMap.values()],
    result: { added, updated, collections: colAdded },
  };
}
