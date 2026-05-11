// ─── Types ────────────────────────────────────────────────────────────────────

export type AIProviderType = "gemini" | "openai-compat";

export interface GeminiConfig {
  type: "gemini";
  apiKey: string;
  model: string; // default: "gemini-3.1-flash-lite"
}

export interface OpenAICompatConfig {
  type: "openai-compat";
  baseUrl: string;   // e.g. https://api.openai.com
  apiKey: string;
  modelId: string;
}

export type AIConfig = GeminiConfig | OpenAICompatConfig;

// ─── Persistence (now using database) ────────────────────────────────────────

export async function loadAIConfig(): Promise<AIConfig | null> {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No auth token found');
      return null;
    }

    // First, get the config metadata
    const response = await fetch('/api/ai', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch AI config:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.configured) {
      console.log('AI not configured');
      return null;
    }

    // Then fetch the decrypted API key
    const keyResponse = await fetch('/api/ai/key', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!keyResponse.ok) {
      console.error('Failed to fetch API key:', keyResponse.status);
      return null;
    }

    const keyData = await keyResponse.json();

    if (keyData.provider_type === 'gemini') {
      return {
        type: 'gemini',
        apiKey: keyData.api_key,
        model: keyData.model_id,
      };
    } else {
      return {
        type: 'openai-compat',
        baseUrl: keyData.base_url,
        apiKey: keyData.api_key,
        modelId: keyData.model_id,
      };
    }
  } catch (error) {
    console.error('Error loading AI config:', error);
    return null;
  }
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');

  const body = config.type === 'gemini'
    ? {
        provider_type: 'gemini',
        api_key: config.apiKey,
        model_id: config.model,
      }
    : {
        provider_type: 'openai-compat',
        api_key: config.apiKey,
        model_id: config.modelId,
        base_url: config.baseUrl,
      };

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to save AI configuration';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = `Server error: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  // Parse the success response
  try {
    const result = await response.json();
    console.log('AI config saved successfully:', result);
  } catch (e) {
    console.error('Failed to parse success response:', e);
    // Don't throw - the save was successful even if we can't parse the response
  }
}

export async function clearAIConfig(): Promise<void> {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  await fetch('/api/ai', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

// ─── Core call ────────────────────────────────────────────────────────────────

export async function callAI(
  config: AIConfig,
  systemPrompt: string,
  userMessage: string,
  signal?: AbortSignal
): Promise<string> {
  if (config.type === "gemini") {
    return callGemini(config, systemPrompt, userMessage, signal);
  } else {
    return callOpenAICompat(config, systemPrompt, userMessage, signal);
  }
}

async function callGemini(
  config: GeminiConfig,
  systemPrompt: string,
  userMessage: string,
  signal?: AbortSignal
): Promise<string> {
  const model = config.model || "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAICompat(
  config: OpenAICompatConfig,
  systemPrompt: string,
  userMessage: string,
  signal?: AbortSignal
): Promise<string> {
  const base = config.baseUrl.replace(/\/$/, "");
  const url = `${base}/v1/chat/completions`;

  const body = {
    model: config.modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ─── Feature helpers ──────────────────────────────────────────────────────────

/** Returns up to 5 lowercase tag strings */
export async function suggestTags(
  config: AIConfig,
  title: string,
  description: string,
  content: string,
  existingTags: string[],
  signal?: AbortSignal
): Promise<string[]> {
  const system = `You are a smart tagging assistant for a personal knowledge app.
Given content, suggest 3–5 concise, lowercase, single-word or hyphenated tags.
Prefer tags already used by the user if relevant.
Respond ONLY with a JSON array of strings. Example: ["productivity","ai","research"]`;

  const user = `Existing tags in the library: ${existingTags.slice(0, 30).join(", ") || "none"}

Content to tag:
Title: ${title}
Description: ${description}
Content: ${content?.slice(0, 600) || ""}`;

  const raw = await callAI(config, system, user, signal);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const arr = JSON.parse(clean);
    return Array.isArray(arr)
      ? arr.map((t: unknown) => String(t).toLowerCase().replace(/\s+/g, "-")).slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

/** Returns a 2–3 sentence plain-text summary */
export async function summarizeContent(
  config: AIConfig,
  title: string,
  description: string,
  content: string,
  signal?: AbortSignal
): Promise<string> {
  const system = `You are a concise summarization assistant.
Summarize the provided content in 2–3 sentences.
Plain text only — no markdown, no bullet points.`;

  const user = `Title: ${title}
Description: ${description}
Content: ${content?.slice(0, 2000) || ""}`;

  return callAI(config, system, user, signal);
}

/** Chat with a single item */
export async function chatWithItem(
  config: AIConfig,
  item: { title: string; description?: string; content?: string; url?: string },
  history: { role: "user" | "assistant"; text: string }[],
  question: string,
  signal?: AbortSignal
): Promise<string> {
  const system = `You are a helpful assistant answering questions about a specific saved item.
Use ONLY the provided content to answer. If the answer is not in the content, say so.
Be concise and helpful.

ITEM CONTENT:
Title: ${item.title}
URL: ${item.url || ""}
Description: ${item.description || ""}
Notes: ${item.content?.slice(0, 3000) || ""}`;

  const conversationContext =
    history.length > 0
      ? history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n") + "\n"
      : "";

  const user = `${conversationContext}User: ${question}`;

  return callAI(config, system, user, signal);
}

/** Chat with the entire knowledge base */
export async function chatWithKnowledgeBase(
  config: AIConfig,
  items: Array<{ title: string; description?: string; content?: string; tags: string[]; type: string }>,
  history: { role: "user" | "assistant"; text: string }[],
  question: string,
  signal?: AbortSignal
): Promise<string> {
  // Build a comprehensive context from all non-deleted items
  // Include full content for better knowledge
  const context = items
    .slice(0, 50) // Limit to 50 items to avoid token limits
    .map((it, i) => {
      const parts = [
        `[${i + 1}] ${it.type.toUpperCase()}: ${it.title}`,
        it.description ? `Description: ${it.description}` : '',
        it.content ? `Content: ${it.content.slice(0, 500)}` : '', // Include first 500 chars of content
        it.tags.length ? `Tags: ${it.tags.join(", ")}` : ''
      ].filter(Boolean);
      return parts.join('\n');
    })
    .join('\n\n')
    .slice(0, 8000); // Limit total context to ~8000 chars

  const system = `You are a helpful AI assistant with access to the user's personal knowledge base.
Answer questions based on the items listed below. Reference item titles when relevant.
Be concise, specific, and helpful. If nothing is relevant, say so.

KNOWLEDGE BASE (${items.length} items):
${context}`;

  const conversationContext =
    history.length > 0
      ? history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n") + "\n"
      : "";

  const user = `${conversationContext}User: ${question}`;

  return callAI(config, system, user, signal);
}

/** Smart semantic search — returns IDs ranked by relevance */
export async function smartSearch(
  config: AIConfig,
  query: string,
  items: Array<{ id: string; title: string; description?: string; content?: string; tags: string[]; type: string }>,
  signal?: AbortSignal
): Promise<string[]> {
  const compact = items
    .map((it) => `${it.id}|||${it.title} ${it.description || ""} ${it.tags.join(" ")} ${it.content?.slice(0, 100) || ""}`)
    .join("\n")
    .slice(0, 5000);

  const system = `You are a semantic search engine for a personal knowledge app.
Given a natural-language query and a list of items, return the IDs of the top 10 most relevant items.
Respond ONLY with a JSON array of ID strings in order of relevance.
Example: ["abc123","def456"]`;

  const user = `Query: "${query}"\n\nItems:\n${compact}`;

  const raw = await callAI(config, system, user, signal);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const arr = JSON.parse(clean);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
