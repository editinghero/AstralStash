// ─── Types ────────────────────────────────────────────────────────────────────

export type AIProviderType = "gemini" | "groq" | "mistral" | "claude" | "openai" | "openai-compat";

export interface GeminiConfig {
  type: "gemini";
  apiKey: string;
  model: string;
  enableSearch?: boolean;
  braveSearchApiKey?: string;
}

export interface GroqConfig {
  type: "groq";
  apiKey: string;
  model: string; // default: "llama-3.3-70b-versatile"
  enableSearch?: boolean; // Enable web search (native on compound)
  braveSearchApiKey?: string; // Optional Brave Search API key
}

export interface MistralConfig {
  type: "mistral";
  apiKey: string;
  model: string;
  enableSearch?: boolean;
  braveSearchApiKey?: string;
}

export interface ClaudeConfig {
  type: "claude";
  apiKey: string;
  model: string;
  enableSearch?: boolean;
  braveSearchApiKey?: string;
}

export interface OpenAIConfig {
  type: "openai";
  apiKey: string;
  model: string;
  enableSearch?: boolean;
  braveSearchApiKey?: string;
}

export interface OpenAICompatConfig {
  type: "openai-compat";
  baseUrl: string;   // e.g. https://api.openai.com
  apiKey: string;
  modelId: string;
  enableSearch?: boolean; // Enable Brave Search fallback
  braveSearchApiKey?: string; // Optional Brave Search API key
}

export type AIConfig = GeminiConfig | GroqConfig | MistralConfig | ClaudeConfig | OpenAIConfig | OpenAICompatConfig;

// ─── Persistence (now using database) ────────────────────────────────────────

export async function loadAIConfig(provider?: AIProviderType): Promise<AIConfig | null> {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No auth token found');
      return null;
    }

    // Use stored active provider if no specific provider requested
    const activeProvider = provider || localStorage.getItem('active_ai_provider') as AIProviderType | null;
    const query = activeProvider ? `?provider=${activeProvider}` : '';

    // First, get the config metadata
    const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai${query}`, {
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
    const keyResponse = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai/key${query}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!keyResponse.ok) {
      console.error('Failed to fetch API key:', keyResponse.status);
      return null;
    }

    const keyData = await keyResponse.json();

    // Map provider types to config objects
    switch (keyData.provider_type) {
      case 'gemini':
        return {
          type: 'gemini',
          apiKey: keyData.api_key,
          model: keyData.model_id,
          enableSearch: keyData.enable_search,
        };
      case 'groq':
        return {
          type: 'groq',
          apiKey: keyData.api_key,
          model: keyData.model_id,
          enableSearch: keyData.enable_search,
          braveSearchApiKey: keyData.brave_search_api_key,
        };
      case 'mistral':
        return {
          type: 'mistral',
          apiKey: keyData.api_key,
          model: keyData.model_id,
          enableSearch: keyData.enable_search,
        };
      case 'claude':
        return {
          type: 'claude',
          apiKey: keyData.api_key,
          model: keyData.model_id,
          enableSearch: keyData.enable_search,
        };
      case 'openai':
        return {
          type: 'openai',
          apiKey: keyData.api_key,
          model: keyData.model_id,
          enableSearch: keyData.enable_search,
        };
      case 'openai-compat':
        return {
          type: 'openai-compat',
          baseUrl: keyData.base_url,
          apiKey: keyData.api_key,
          modelId: keyData.model_id,
          enableSearch: keyData.enable_search,
          braveSearchApiKey: keyData.brave_search_api_key,
        };
      default:
        console.error('Unknown provider type:', keyData.provider_type);
        return null;
    }
  } catch (error) {
    console.error('Error loading AI config:', error);
    return null;
  }
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');

  // Store active provider in localStorage so we load the right one on reload
  localStorage.setItem('active_ai_provider', config.type);

  let body: any;

  switch (config.type) {
    case 'gemini':
      body = {
        provider_type: 'gemini',
        api_key: config.apiKey,
        model_id: config.model,
        enable_search: config.enableSearch || false,
      };
      break;
    case 'groq':
      body = {
        provider_type: 'groq',
        api_key: config.apiKey,
        model_id: config.model,
        enable_search: config.enableSearch || false,
        brave_search_api_key: config.braveSearchApiKey || null,
      };
      break;
    case 'mistral':
      body = {
        provider_type: 'mistral',
        api_key: config.apiKey,
        model_id: config.model,
        enable_search: config.enableSearch || false,
      };
      break;
    case 'claude':
      body = {
        provider_type: 'claude',
        api_key: config.apiKey,
        model_id: config.model,
        enable_search: config.enableSearch || false,
      };
      break;
    case 'openai':
      body = {
        provider_type: 'openai',
        api_key: config.apiKey,
        model_id: config.model,
        enable_search: config.enableSearch || false,
      };
      break;
    case 'openai-compat':
      body = {
        provider_type: 'openai-compat',
        api_key: config.apiKey,
        model_id: config.modelId,
        base_url: config.baseUrl,
        enable_search: config.enableSearch || false,
        brave_search_api_key: config.braveSearchApiKey || null,
      };
      break;
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai`, {
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

  await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

// ─── Core call ────────────────────────────────────────────────────────────────

// Brave Search API fallback (for providers without native search)
// Free tier: 2000 queries/month with $5 credit
async function searchBrave(query: string, apiKey?: string): Promise<string> {
  try {
    // Get Brave Search API key from config or environment
    const braveApiKey = apiKey || import.meta.env.VITE_BRAVE_SEARCH_API_KEY;
    if (!braveApiKey) {
      console.warn('Brave Search API key not configured');
      return 'Web search unavailable (API key not configured).';
    }

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          'X-Subscription-Token': braveApiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Brave Search API error:', response.status);
      return 'Web search unavailable.';
    }

    const data = await response.json();
    const results = data.web?.results || [];

    if (results.length === 0) {
      return 'No search results found.';
    }

    // Format results for AI context
    const formatted = results
      .slice(0, 5)
      .map((r: any, i: number) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description || ''}`
      )
      .join('\n\n');

    return `Web Search Results:\n\n${formatted}`;
  } catch (error) {
    console.error('Brave Search error:', error);
    return 'Web search unavailable.';
  }
}

export async function callAI(
  config: AIConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; text: string }[] = [],
  signal?: AbortSignal
): Promise<string> {
  // If Brave Search API key is configured and search is enabled,
  // use Brave Search for ALL providers and disable their native search
  const braveKey = (config as any).braveSearchApiKey;
  let finalSystemPrompt = systemPrompt;
  let finalConfig = config;

  if (config.enableSearch && braveKey) {
    const searchResults = await searchBrave(userMessage, braveKey);
    finalSystemPrompt = `${systemPrompt}\n\nWeb Search Context:\n${searchResults}\n\nUse the above web search context to help answer the user's question accurately.`;
    // Disable native search so provider doesn't also try to search
    finalConfig = { ...config, enableSearch: false };
  }

  switch (finalConfig.type) {
    case "gemini":
      return callGemini(finalConfig, finalSystemPrompt, userMessage, history, signal);
    case "groq":
      return callGroq(finalConfig, finalSystemPrompt, userMessage, history, signal);
    case "mistral":
      return callMistral(finalConfig, finalSystemPrompt, userMessage, history, signal);
    case "claude":
      return callClaude(finalConfig, finalSystemPrompt, userMessage, history, signal);
    case "openai":
      return callOpenAI(finalConfig, finalSystemPrompt, userMessage, history, signal);
    case "openai-compat":
      return callOpenAICompat(finalConfig, finalSystemPrompt, userMessage, history, signal);
  }
}

async function callGemini(
  config: GeminiConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; text: string }[] = [],
  signal?: AbortSignal
): Promise<string> {
  const model = config.model || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  let finalSystemPrompt = systemPrompt;
  if (config.enableSearch) {
    finalSystemPrompt += "\n\nUse web search tool to find relevant information if needed.";
  }

  const formattedHistory = history.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }]
  }));

  const body: any = {
    system_instruction: { parts: [{ text: finalSystemPrompt }] },
    contents: [...formattedHistory, { role: "user", parts: [{ text: userMessage }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  // Enable Google Search if configured (native support)
  if (config.enableSearch) {
    body.tools = [{ googleSearch: {} }];
  }

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

async function callGroq(
  config: GroqConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; text: string }[] = [],
  signal?: AbortSignal
): Promise<string> {
  const model = config.model || "llama-3.3-70b-versatile";
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const isCompoundModel = model.startsWith("groq/compound");

  // Format history
  const formattedHistory = history.map(m => ({ role: m.role, content: m.text }));

  let messages: any[];

  if (isCompoundModel) {
    // Compound models: Groq docs show only user messages, no system role.
    // Merge any context into the first user message so compound can auto-search.
    const contextPrefix = systemPrompt
      ? `Context:\n${systemPrompt}\n\nUser question: `
      : "";
    messages = [
      ...formattedHistory,
      { role: "user", content: `${contextPrefix}${userMessage}` },
    ];
  } else {
    // Non-compound models: standard system + user format
    messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      { role: "user", content: userMessage },
    ];
  }

  const body: any = {
    model: model,
    messages: messages,
    temperature: 0.3,
    max_tokens: 2048,
  };

  console.log(`[Groq] Calling model: ${model}, compound: ${isCompoundModel}, messages: ${messages.length}`);

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
    console.error(`[Groq] Error:`, err);
    throw new Error(err?.error?.message || `Groq error ${res.status}`);
  }

  const data = await res.json();
  // Log executed tools for compound models to verify search happened
  if (isCompoundModel && data?.choices?.[0]?.message?.executed_tools) {
    console.log("[Groq] Executed tools:", JSON.stringify(data.choices[0].message.executed_tools));
  }
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callMistral(
  config: MistralConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; text: string }[] = [],
  signal?: AbortSignal
): Promise<string> {
  const model = config.model || "mistral-medium-latest";
  const url = "https://api.mistral.ai/v1/chat/completions";

  let finalSystemPrompt = systemPrompt;
  if (config.enableSearch) {
    finalSystemPrompt += "\n\nUse web search tool to find relevant information if needed.";
  }

  const formattedHistory = history.map(m => ({ role: m.role, content: m.text }));

  const body: any = {
    model: model,
    messages: [
      { role: "system", content: finalSystemPrompt },
      ...formattedHistory,
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  };

  // Enable web search if configured (native support)
  if (config.enableSearch) {
    body.tools = [{ type: "web_search" }];
  }

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
    throw new Error(err?.error?.message || `Mistral error ${res.status}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callClaude(
  config: ClaudeConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; text: string }[] = [],
  signal?: AbortSignal
): Promise<string> {
  const model = config.model || "claude-3-5-sonnet-20241022";
  const url = "https://api.anthropic.com/v1/messages";

  let finalSystemPrompt = systemPrompt;
  if (config.enableSearch) {
    finalSystemPrompt += "\n\nUse web search tool to find relevant information if needed.";
  }

  const formattedHistory = history.map(m => ({ role: m.role, content: m.text }));

  const body: any = {
    model: model,
    system: finalSystemPrompt,
    messages: [...formattedHistory, { role: "user", content: userMessage }],
    temperature: 0.3,
    max_tokens: 1024,
  };

  // Enable web search if configured (native support via web_search tool)
  if (config.enableSearch) {
    body.tools = [{
      type: "web_search",
      name: "web_search",
      max_uses: 5
    }];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude error ${res.status}`);
  }

  const data = await res.json();

  // Extract text from content blocks (handles both text and tool results)
  const content = data?.content || [];
  const textBlocks = content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n");

  return textBlocks || "";
}

async function callOpenAI(
  config: OpenAIConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; text: string }[] = [],
  signal?: AbortSignal
): Promise<string> {
  const model = config.model || "gpt-4o-mini";
  const url = "https://api.openai.com/v1/chat/completions";

  let enhancedSystemPrompt = systemPrompt;
  if (config.enableSearch) {
    const searchResults = await searchBrave(userMessage);
    enhancedSystemPrompt = `${systemPrompt}\n\nWeb Search Context:\n${searchResults}\n\nUse the above web search context to help answer the user's question accurately.`;
  }

  const formattedHistory = history.map(m => ({ role: m.role, content: m.text }));

  const body = {
    model: model,
    messages: [
      { role: "system", content: enhancedSystemPrompt },
      ...formattedHistory,
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
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callOpenAICompat(
  config: OpenAICompatConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; text: string }[] = [],
  signal?: AbortSignal
): Promise<string> {
  const url = config.baseUrl.replace(/\/$/, "");

  let enhancedSystemPrompt = systemPrompt;
  if (config.enableSearch) {
    const searchResults = await searchBrave(userMessage, config.braveSearchApiKey);
    enhancedSystemPrompt = `${systemPrompt}\n\nWeb Search Context:\n${searchResults}\n\nUse the above web search context to help answer the user's question accurately.`;
  }

  const formattedHistory = history.map(m => ({ role: m.role, content: m.text }));

  const body = {
    model: config.modelId,
    messages: [
      { role: "system", content: enhancedSystemPrompt },
      ...formattedHistory,
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

/** Auto-generate a title for a link by fetching and analyzing the URL */
export async function autoGenerateTitle(
  config: AIConfig,
  url: string,
  description?: string,
  signal?: AbortSignal
): Promise<string> {
  const system = `You are a smart title generator for bookmarks and saved links.
Given a URL and optional description, generate a clear, concise title (max 60 characters).
The title should be descriptive and capture the main topic or purpose of the link.
Respond with ONLY the title text, no quotes, no extra formatting.`;

  const user = `URL: ${url}
Description: ${description || ""}

Generate a clear, descriptive title for this link.`;

  return callAI(config, system, user, signal);
}

/** Format markdown content using available MD tools */
export async function formatMarkdown(
  config: AIConfig,
  content: string,
  signal?: AbortSignal
): Promise<string> {
  const system = `You are a markdown formatting assistant.
Format the provided text using proper markdown syntax.

Available markdown tools:
- **bold** for emphasis
- *italic* for subtle emphasis
- ~~strikethrough~~ for deleted/outdated text
- ## Headings for section titles (use ##, ###, #### etc.)
- - Bullet lists for unordered items
- 1. Numbered lists for ordered items
- - [ ] Task lists for checkboxes/todos
- \`inline code\` for inline code or technical terms
- \`\`\`language\ncode block\n\`\`\` for multi-line code blocks
- [link text](url) for hyperlinks
- ![alt text](image-url) for images
- > Quotes for blockquotes or citations
- --- for horizontal rules/dividers
- | Table | Header | for tables with | --- | separators

Rules:
1. Preserve the original meaning and content
2. Use markdown formatting to improve readability and structure
3. Add headings to organize sections if the content is long
4. Use lists for enumerated items
5. Use bold/italic for emphasis where appropriate
6. Use code formatting for technical terms, commands, or code snippets
7. Use task lists for action items or todos
8. Use tables for structured data
9. Preserve line breaks between paragraphs
10. Do NOT add extra content or change the meaning
11. Return ONLY the formatted markdown, no explanations

Respond with the formatted markdown content.`;

  const user = `Format this content using markdown:

${content}`;

  return callAI(config, system, user, signal);
}

/** Format plain text content (improve structure without markdown) */
export async function formatPlainText(
  config: AIConfig,
  content: string,
  signal?: AbortSignal
): Promise<string> {
  const system = `You are a text formatting assistant.
Format the provided text to improve readability and structure using ONLY plain text.

Rules:
1. Do NOT use markdown syntax (no **, *, ##, -, \`, [], >, etc.)
2. Use proper line breaks and spacing for readability
3. Use CAPITAL LETTERS for section headings if needed
4. Use indentation or numbering for lists
5. Preserve the original meaning and content
6. Improve paragraph structure and flow
7. Do NOT add extra content or change the meaning
8. Return ONLY the formatted plain text, no explanations

Respond with the formatted plain text content.`;

  const user = `Format this content as plain text:

${content}`;

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

  return callAI(config, system, question, history, signal);
}

/** Chat with the entire knowledge base */
export async function chatWithKnowledgeBase(
  config: AIConfig,
  items: Array<{ title: string; description?: string; content?: string; tags: string[]; type: string }>,
  history: { role: "user" | "assistant"; text: string }[],
  question: string,
  signal?: AbortSignal
): Promise<string> {
  const context = items
    .slice(0, 50)
    .map((it, i) => {
      const parts = [
        `[${i + 1}] ${it.type.toUpperCase()}: ${it.title}`,
        it.description ? `Description: ${it.description}` : '',
        it.content ? `Content: ${it.content.slice(0, 500)}` : '',
        it.tags.length ? `Tags: ${it.tags.join(", ")}` : ''
      ].filter(Boolean);
      return parts.join('\n');
    })
    .join('\n\n')
    .slice(0, 8000);

  const system = `You are a helpful AI assistant with access to the user's personal knowledge base.
Answer questions based on the items listed below. Reference item titles when relevant.
Be concise, specific, and helpful. If nothing is relevant, say so.

KNOWLEDGE BASE (${items.length} items):
${context}`;

  return callAI(config, system, question, history, signal);
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
