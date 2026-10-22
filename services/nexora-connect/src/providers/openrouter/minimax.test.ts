import type { ExecutionContext } from "../../core/types.ts";

import { afterEach, expect, it, vi } from "vitest";
import { executors } from "./executors.ts";

const context: ExecutionContext = {
  getCredential: async () => ({
    authType: "api_key",
    apiKey: "test-key",
    values: {},
    profile: { accountId: "test", displayName: "Test", grantedScopes: [] },
    metadata: {},
  }),
};
afterEach(() => vi.unstubAllGlobals());

const ids = [
  "other/model",
  "minimax/minimax-m2.7",
  "minimax/minimax-01",
  "minimax/minimax-m3",
  "other/second",
  "minimax/minimax-m3.1-flash:free",
  "minimax/video-01",
];
const payload = {
  data: ids.map((id) => ({ id, context_length: 524288, pricing: { prompt: "0.0000003" } })),
  marker: "preserved",
};

for (const [action, path] of [
  ["list_available_models", "/models"],
  ["list_user_models", "/models/user"],
]) {
  it(`filters only legacy MiniMax text in ${action} and retains upstream metadata`, async () => {
    const fetch = vi.fn(async () => Response.json(payload));
    vi.stubGlobal("fetch", fetch);
    const expected = [
      "other/model",
      "minimax/minimax-m3.1-flash:free",
      "minimax/minimax-m3",
      "other/second",
      "minimax/video-01",
    ].map((id) => payload.data.find((item) => item.id === id));
    expect(await executors[`openrouter.${action}`]!({}, context)).toEqual({
      ok: true,
      output: { ...payload, data: expected },
    });
    expect(fetch).toHaveBeenCalledWith(
      `https://openrouter.ai/api/v1${path}`,
      expect.objectContaining({ method: "GET" }),
    );
  });
  it(`preserves explicit legacy discovery for ${action}`, async () => {
    const fetch = vi.fn(async () => Response.json(payload));
    vi.stubGlobal("fetch", fetch);
    expect(await executors[`openrouter.${action}`]!({ includeLegacyMinimax: true }, context)).toEqual({
      ok: true,
      output: payload,
    });
    expect(fetch).toHaveBeenCalledWith(
      `https://openrouter.ai/api/v1${path}`,
      expect.objectContaining({ method: "GET" }),
    );
  });
}

for (const model of [
  "minimax/minimax-m3.1-flash:free",
  "minimax/minimax-m3",
  "minimax/minimax-m2.7",
  "other/model",
  "custom/model",
]) {
  for (const [action, path] of [
    ["create_chat_completion", "/chat/completions"],
    ["create_message", "/messages"],
  ]) {
    it(`preserves explicit ${model} through ${action} HTTP serialization`, async () => {
      const input = {
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe" },
              { type: "image_url", image_url: { url: "https://example.com/image.png" } },
            ],
          },
        ],
        max_tokens: 256,
        reasoning: { effort: "high" },
      };
      const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual(input);
        return Response.json({ id: "response-1" });
      });
      vi.stubGlobal("fetch", fetch);
      expect(await executors[`openrouter.${action}`]!(input, context)).toMatchObject({ ok: true });
      expect(fetch).toHaveBeenCalledWith(
        `https://openrouter.ai/api/v1${path}`,
        expect.objectContaining({ method: "POST" }),
      );
    });
  }
}

it("preserves RSS as an explicit feed", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("<rss>unchanged</rss>", { headers: { "content-type": "application/rss+xml" } })),
  );
  expect(await executors["openrouter.list_available_models"]!({ useRss: true }, context)).toEqual({
    ok: true,
    output: { rss: "<rss>unchanged</rss>" },
  });
});

it("does not insert unavailable gateway routes", async () => {
  const response = { data: [{ id: "minimax/minimax-m3" }, { id: "other/model" }] };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(response)),
  );
  expect(await executors["openrouter.list_available_models"]!({}, context)).toEqual({ ok: true, output: response });
});
