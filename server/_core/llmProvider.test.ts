import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "XINUS_AI_PROVIDER",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "AWS_BEARER_TOKEN_BEDROCK",
  "XINUS_BEDROCK_API_KEY",
  "XINUS_BEDROCK_REGION",
  "XINUS_BEDROCK_MODEL",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
] as const;

const original = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadLLM() {
  vi.resetModules();
  return import("./llm");
}

describe("XinUS provider policy", () => {
  it("keeps configured Ollama as the default private provider", async () => {
    process.env.XINUS_AI_PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    process.env.OLLAMA_MODEL = "qwen2.5:3b";

    const { getLLMProviderStatus } = await loadLLM();
    expect(getLLMProviderStatus()).toEqual({
      provider: "ollama",
      ready: true,
      isCloud: false,
      modelConfigured: true,
      restrictedDataAllowed: true,
    });
  });

  it("maps Bedrock Runtime through the server-only OpenAI-compatible endpoint", async () => {
    process.env.XINUS_AI_PROVIDER = "bedrock-runtime";
    process.env.AWS_BEARER_TOKEN_BEDROCK = "bedrock-secret";
    process.env.XINUS_BEDROCK_REGION = "eu-west-1";
    process.env.XINUS_BEDROCK_MODEL = "approved-model";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "response", created: 0, model: "approved-model", choices: [{ index: 0, message: { role: "assistant", content: "ready" }, finish_reason: "stop" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { invokeLLM } = await loadLLM();

    await expect(invokeLLM({ messages: [{ role: "user", content: "hello" }] })).resolves.toMatchObject({ model: "approved-model" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bedrock-runtime.eu-west-1.amazonaws.com/openai/v1/chat/completions",
      expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer bedrock-secret" }) })
    );
  });

  it("prevents restricted workflow data from using a cloud provider before any request is made", async () => {
    process.env.XINUS_AI_PROVIDER = "bedrock-runtime";
    process.env.AWS_BEARER_TOKEN_BEDROCK = "bedrock-secret";
    process.env.XINUS_BEDROCK_MODEL = "approved-model";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { invokeLLM } = await loadLLM();

    await expect(invokeLLM({ messages: [{ role: "user", content: "case text" }], dataSensitivity: "restricted" })).rejects.toThrow("restricted to the private local AI provider");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports the configured Bedrock Runtime model without attempting an unsupported runtime model-catalog call", async () => {
    process.env.XINUS_AI_PROVIDER = "bedrock-runtime";
    process.env.AWS_BEARER_TOKEN_BEDROCK = "bedrock-secret";
    process.env.XINUS_BEDROCK_MODEL = "approved-model";
    const { listLLMModels } = await loadLLM();

    await expect(listLLMModels()).resolves.toEqual({ object: "list", data: [{ id: "approved-model", object: "model", created: 0, owned_by: "bedrock-runtime" }] });
  });
});
