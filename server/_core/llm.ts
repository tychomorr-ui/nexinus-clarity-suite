import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
  /** Restricted requests cannot be routed to a cloud provider without a future product-level consent flow. */
  dataSensitivity?: "standard" | "restricted";
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

export type XinUSAIProvider = "ollama" | "bedrock-runtime" | "bedrock-mantle" | "forge";

type ProviderConfig = {
  id: XinUSAIProvider;
  apiUrl: string;
  modelsUrl?: string;
  authorization: string;
  defaultModel?: string;
  isCloud: boolean;
  region?: string;
};

export type LLMProviderStatus = {
  provider: XinUSAIProvider;
  ready: boolean;
  isCloud: boolean;
  region?: string;
  modelConfigured: boolean;
  restrictedDataAllowed: boolean;
};

const localOllamaBaseUrl = () => process.env.OLLAMA_BASE_URL?.trim().replace(/\/$/, "") || "";
const usesLocalOllama = () => localOllamaBaseUrl().length > 0;

function configuredProvider(): XinUSAIProvider {
  const explicit = ENV.xinusAiProvider.trim().toLowerCase();
  if (!explicit) return usesLocalOllama() ? "ollama" : "forge";
  if (explicit === "ollama" || explicit === "bedrock-runtime" || explicit === "bedrock-mantle" || explicit === "forge") return explicit;
  throw new Error("XinUS AI provider configuration is invalid. Use ollama, bedrock-runtime, bedrock-mantle, or forge.");
}

function bedrockBaseUrl(provider: "bedrock-runtime" | "bedrock-mantle", region: string) {
  return provider === "bedrock-runtime"
    ? `https://bedrock-runtime.${region}.amazonaws.com/openai/v1`
    : `https://bedrock-mantle.${region}.api.aws/v1`;
}

function resolveProviderConfig(): ProviderConfig {
  const provider = configuredProvider();
  if (provider === "ollama") {
    if (!usesLocalOllama()) throw new Error("XinUS local AI is not configured. Set OLLAMA_BASE_URL or select another server-side provider.");
    return {
      id: provider,
      apiUrl: `${localOllamaBaseUrl()}/v1/chat/completions`,
      modelsUrl: `${localOllamaBaseUrl()}/v1/models`,
      authorization: "Bearer ollama",
      defaultModel: process.env.OLLAMA_MODEL?.trim() || undefined,
      isCloud: false,
    };
  }

  if (provider === "bedrock-runtime" || provider === "bedrock-mantle") {
    const region = ENV.bedrockRegion.trim() || "eu-west-1";
    if (!ENV.bedrockApiKey.trim()) throw new Error("XinUS Bedrock is not configured. Add a server-side Bedrock bearer token before enabling this provider.");
    if (!ENV.bedrockModel.trim()) throw new Error("XinUS Bedrock is not ready. Configure an approved Bedrock model before enabling this provider.");
    const baseUrl = bedrockBaseUrl(provider, region);
    return {
      id: provider,
      apiUrl: `${baseUrl}/chat/completions`,
      modelsUrl: provider === "bedrock-mantle" ? `${baseUrl}/models` : undefined,
      authorization: `Bearer ${ENV.bedrockApiKey}`,
      defaultModel: ENV.bedrockModel.trim(),
      isCloud: true,
      region,
    };
  }

  if (!ENV.forgeApiKey.trim()) throw new Error("No XinUS AI provider is configured. Configure local Ollama, Amazon Bedrock, or the server-side Forge provider.");
  const baseUrl = ENV.forgeApiUrl.trim().replace(/\/$/, "") || "https://forge.manus.im";
  return {
    id: provider,
    apiUrl: `${baseUrl}/v1/chat/completions`,
    modelsUrl: `${baseUrl}/v1/models`,
    authorization: `Bearer ${ENV.forgeApiKey}`,
    isCloud: true,
  };
}

export function getLLMProviderStatus(): LLMProviderStatus {
  try {
    const provider = configuredProvider();
    const isBedrock = provider === "bedrock-runtime" || provider === "bedrock-mantle";
    const ready = provider === "ollama"
      ? usesLocalOllama()
      : isBedrock
        ? Boolean(ENV.bedrockApiKey.trim() && ENV.bedrockModel.trim())
        : Boolean(ENV.forgeApiKey.trim());
    return {
      provider,
      ready,
      isCloud: provider !== "ollama",
      ...(isBedrock ? { region: ENV.bedrockRegion.trim() || "eu-west-1" } : {}),
      modelConfigured: provider === "ollama" ? Boolean(process.env.OLLAMA_MODEL?.trim()) : isBedrock ? Boolean(ENV.bedrockModel.trim()) : true,
      restrictedDataAllowed: provider === "ollama",
    };
  } catch {
    return { provider: "ollama", ready: false, isCloud: false, modelConfigured: false, restrictedDataAllowed: true };
  }
}

function assertDataPolicy(provider: ProviderConfig, sensitivity: InvokeParams["dataSensitivity"]) {
  if (sensitivity === "restricted" && provider.isCloud) {
    throw new Error("This XinUS workflow is restricted to the private local AI provider. Cloud analysis is not enabled for this data category.");
  }
}

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum
// delay so a misbehaving caller loop slows down instead of hammering the
// upstream while it keeps returning errors.
const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

// Retries non-2xx responses and network errors with exponential backoff, then
// returns the final Response so callers keep their existing error handling.
const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const provider = resolveProviderConfig();
  assertDataPolicy(provider, params.dataSensitivity);

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens,
    dataSensitivity: _dataSensitivity,
  } = params;

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  const resolvedModel = model || provider.defaultModel;
  if (resolvedModel) {
    payload.model = resolvedModel;
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }

  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetchWithBackoff(provider.apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: provider.authorization,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `XinUS AI provider ${provider.id} is temporarily unavailable (${response.status}). Please retry shortly.`
    );
  }

  return (await response.json()) as InvokeResult;
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  const provider = resolveProviderConfig();
  if (!provider.modelsUrl) {
    return {
      object: "list",
      data: provider.defaultModel ? [{ id: provider.defaultModel, object: "model", created: 0, owned_by: provider.id }] : [],
    };
  }

  const response = await fetchWithBackoff(provider.modelsUrl, {
    headers: { authorization: provider.authorization },
  });

  if (!response.ok) {
    throw new Error(
      `XinUS AI provider ${provider.id} model catalog is temporarily unavailable (${response.status}).`
    );
  }

  return (await response.json()) as ModelsResponse;
}
