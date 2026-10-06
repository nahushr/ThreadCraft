import type { ThreadCraftChatModel } from "@simplishelf/threadcraft";

export type ExampleAiProvider = "gemini" | "groq";
export interface ExampleChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProviderErrorPayload {
  error?: { message?: string } | string;
  message?: string;
}

const getErrorMessage = async (response: Response): Promise<string> => {
  let payload: ProviderErrorPayload = {};
  try {
    payload = await response.json() as ProviderErrorPayload;
  } catch {
    // Use the HTTP status when the provider does not return JSON.
  }
  const providerMessage = typeof payload.error === "string"
    ? payload.error
    : payload.error?.message ?? payload.message;
  return providerMessage || `Provider request failed with status ${response.status}.`;
};

const requestJson = async <T>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json() as Promise<T>;
};

interface GeminiModelResponse {
  models?: Array<{
    name?: string;
    baseModelId?: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
  }>;
  nextPageToken?: string;
}

interface GroqModelResponse {
  data?: Array<{ id?: string; active?: boolean }>;
}

export async function loadProviderModels(
  provider: ExampleAiProvider,
  apiKey: string,
): Promise<ThreadCraftChatModel[]> {
  if (!apiKey.trim()) throw new Error(`Enter a ${providerLabel(provider)} API key first.`);
  if (provider === "groq") return loadGroqModels(apiKey.trim());
  return loadGeminiModels(apiKey.trim());
}

const providerLabel = (provider: ExampleAiProvider): string =>
  provider === "gemini" ? "Gemini" : "Groq";

const loadGroqModels = async (apiKey: string): Promise<ThreadCraftChatModel[]> => {
  const result = await requestJson<GroqModelResponse>("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const models = (result.data ?? [])
    .filter((model) => model.id && model.active !== false)
    .filter((model) => !/(whisper|speech|tts|embedding)/i.test(model.id ?? ""))
    .map(({ id }) => ({ id: id as string, label: id as string }))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (models.length === 0) throw new Error("No active text chat models were returned for this Groq key.");
  return models;
};

const loadGeminiModels = async (apiKey: string): Promise<ThreadCraftChatModel[]> => {
  const models: ThreadCraftChatModel[] = [];
  const seenIds = new Set<string>();
  await loadGeminiModelPage(apiKey, undefined, models, seenIds, 0);
  models.sort((left, right) => left.id.localeCompare(right.id));
  if (models.length === 0) throw new Error("No Gemini models with text generation support were returned for this key.");
  return models;
};

const loadGeminiModelPage = async (
  apiKey: string,
  pageToken: string | undefined,
  models: ThreadCraftChatModel[],
  seenIds: Set<string>,
  pageCount: number,
): Promise<void> => {
  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
  url.searchParams.set("pageSize", "1000");
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const page = await requestJson<GeminiModelResponse>(url.toString(), {
    headers: { "x-goog-api-key": apiKey },
  });
  for (const model of page.models ?? []) {
    if (!model.supportedGenerationMethods?.includes("generateContent")) continue;
    const id = model.baseModelId ?? model.name?.replace(/^models\//, "");
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    models.push({ id, label: model.displayName ? `${model.displayName} (${id})` : id });
  }
  if (page.nextPageToken && pageCount < 9) {
    await loadGeminiModelPage(apiKey, page.nextPageToken, models, seenIds, pageCount + 1);
  }
};

interface GeminiGenerationResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

interface GroqCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export async function generateProviderReply(
  provider: ExampleAiProvider,
  model: string,
  apiKey: string,
  history: ExampleChatMessage[],
): Promise<string> {
  if (!apiKey.trim()) throw new Error("Enter an API key before sending a message.");
  if (!model) throw new Error("Load models and choose one before sending a message.");

  if (provider === "gemini") {
    const result = await requestJson<GeminiGenerationResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey.trim(),
        },
        body: JSON.stringify({
          contents: history.map(({ role, content }) => ({
            role: role === "assistant" ? "model" : "user",
            parts: [{ text: content }],
          })),
        }),
      },
    );
    const answer = result.candidates?.[0]?.content?.parts
      ?.map(({ text }) => text ?? "")
      .join("")
      .trim();
    if (!answer) throw new Error("Gemini returned an empty response. Try a different model or prompt.");
    return answer;
  }

  const result = await requestJson<GroqCompletionResponse>("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: history.map(({ role, content }) => ({ role, content })),
    }),
  });
  const answer = result.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("Groq returned an empty response. Try a different model or prompt.");
  return answer;
}
