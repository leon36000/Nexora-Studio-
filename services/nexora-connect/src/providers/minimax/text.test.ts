import type { ExecutionContext } from "../../core/types.ts";

import { afterEach, describe, expect, it, vi } from "vitest";
import { validateActionInput } from "../../core/validation.ts";
import { minimaxActions } from "./actions.ts";
import { executors, proxy } from "./executors.ts";

function context(region: string): ExecutionContext {
  return {
    getCredential: async () => ({
      authType: "api_key",
      apiKey: "test-key",
      values: { region },
      profile: { accountId: "test", displayName: "Test", grantedScopes: [] },
      metadata: {},
    }),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("MiniMax text requests", () => {
  for (const [region, host] of [
    ["global", "api.minimax.io"],
    ["china", "api.minimaxi.com"],
  ]) {
    for (const [action, path] of [
      ["create_response", "/v1/responses"],
      ["estimate_input_tokens", "/v1/responses/input_tokens"],
    ]) {
      it(`defaults ${action} to Flash in ${region} at the HTTP boundary`, async () => {
        const input = { input: "Hello" };
        const definition = minimaxActions.find((item) => item.name === action)!;
        expect(validateActionInput(definition, input).valid).toBe(true);
        const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
          expect(JSON.parse(String(init?.body))).toEqual({ model: "MiniMax-M3.1-Flash", input: "Hello" });
          return Response.json({ id: "response-1" });
        });
        vi.stubGlobal("fetch", fetch);
        expect(await executors[`minimax.${action}`]!(input, context(region!))).toEqual({
          ok: true,
          output: { id: "response-1" },
        });
        expect(fetch).toHaveBeenCalledWith(
          `https://${host}${path}`,
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({ authorization: "Bearer test-key" }),
          }),
        );
        expect(input).toEqual({ input: "Hello" });
      });
    }
  }

  for (const model of ["MiniMax-M3.1-Flash", "MiniMax-M3", "MiniMax-M2.7", "saved-custom-model"]) {
    it(`preserves explicit ${model}, tools, and conversation history`, async () => {
      const input = {
        model,
        input: [
          { role: "user", content: "Look up the weather" },
          { type: "function_call", call_id: "call-1", name: "weather", arguments: "{}" },
          { type: "function_call_output", call_id: "call-1", output: "Sunny" },
        ],
        tools: [{ type: "function", name: "weather", parameters: { type: "object", properties: {} } }],
        max_output_tokens: 1234,
        reasoning: { effort: model === "MiniMax-M3.1-Flash" ? "max" : "none" },
      };
      const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual(input);
        return Response.json({ id: "response-1" });
      });
      vi.stubGlobal("fetch", fetch);
      expect(await executors["minimax.create_response"]!(input, context("global"))).toMatchObject({ ok: true });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  }

  for (const effort of ["low", "medium", "high", "xhigh", "max"]) {
    it(`accepts and forwards Flash effort ${effort}`, async () => {
      const input = { input: "Hello", reasoning: { effort } };
      expect(
        validateActionInput(
          minimaxActions.find((item) => item.name === "create_response")!,
          input,
        ).valid,
      ).toBe(true);
      const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        expect(JSON.parse(String(init?.body)).reasoning).toEqual({ effort });
        return Response.json({ id: "response-1" });
      });
      vi.stubGlobal("fetch", fetch);
      expect(await executors["minimax.create_response"]!(input, context("global"))).toMatchObject({ ok: true });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  }

  for (const options of [
    { reasoning: { effort: "none" } },
    { reasoning: { effort: "minimal" } },
    { service_tier: "standard" },
  ]) {
    it(`rejects unsupported Flash controls ${JSON.stringify(options)} before transport`, async () => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const result = await executors["minimax.create_response"]!({ input: "Hello", ...options }, context("global"));
      expect(result).toMatchObject({ ok: false, error: { message: expect.stringContaining("MiniMax-M3.1-Flash") } });
      expect(fetch).not.toHaveBeenCalled();
    });
  }

  it("preserves an explicit M3 service tier", async () => {
    const input = { model: "MiniMax-M3", input: "Hello", service_tier: "priority", reasoning: { effort: "none" } };
    const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual(input);
      return Response.json({ id: "response-1" });
    });
    vi.stubGlobal("fetch", fetch);
    expect(await executors["minimax.create_response"]!(input, context("global"))).toMatchObject({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("leaves explicit raw proxy payloads unchanged", async () => {
    const body = { model: "saved-custom-model", input: "Hello", custom_option: true };
    const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual(body);
      return Response.json({ id: "response-1" });
    });
    vi.stubGlobal("fetch", fetch);
    expect(await proxy({ method: "POST", endpoint: "/v1/responses", body }, context("global"))).toMatchObject({
      ok: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not reset an invalid explicit model to Flash", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      await executors["minimax.create_response"]!({ model: " ", input: "Hello" }, context("global")),
    ).toMatchObject({ ok: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("MiniMax media preservation", () => {
  for (const [action, path, input] of [
    [
      "create_video_generation_v2",
      "/v2/video_generation",
      {
        model: "MiniMax-H3",
        content: [
          { type: "text", text: "Ocean" },
          { type: "image_url", image_url: { url: "https://example.com/frame.png" }, role: "first_frame" },
        ],
        duration: 4,
        resolution: "768P",
        aigc_watermark: false,
      },
    ],
    [
      "text_to_audio",
      "/v1/t2a_v2",
      { model: "speech-2.8-hd", text: "Hello", voice_setting: { voice_id: "English_expressive_narrator" } },
    ],
  ] as const) {
    it(`preserves ${action} payloads through the regional executor`, async () => {
      const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual(input);
        return Response.json({ task_id: "task-1" });
      });
      vi.stubGlobal("fetch", fetch);
      expect(await executors[`minimax.${action}`]!(input, context("china"))).toMatchObject({ ok: true });
      expect(fetch).toHaveBeenCalledWith(
        `https://api.minimaxi.com${path}`,
        expect.objectContaining({ method: "POST" }),
      );
    });
  }
});

describe("MiniMax model discovery", () => {
  const ids = [
    "MiniMax-M2.7",
    "MiniMax-M3",
    "speech-2.8-hd",
    "MiniMax-H3",
    "custom-model",
    "abab6.5-chat",
    "MiniMax-M3.1-Flash",
    "M2-her",
    "MiniMax-Text-01",
  ];
  const payload = {
    object: "list",
    data: ids.map((id) => ({ id, object: "model", owned_by: "minimax" })),
    extra: "preserved",
  };

  it("offers Flash first and M3 second while preserving media and custom entries", async () => {
    const fetch = vi.fn(async () => Response.json(payload));
    vi.stubGlobal("fetch", fetch);
    const result = await executors["minimax.list_models"]!({}, context("global"));
    expect(result).toEqual({
      ok: true,
      output: {
        ...payload,
        data: ["MiniMax-M3.1-Flash", "MiniMax-M3", "speech-2.8-hd", "MiniMax-H3", "custom-model"].map((id) =>
          payload.data.find((item) => item.id === id),
        ),
      },
    });
    expect(fetch).toHaveBeenCalledWith("https://api.minimax.io/v1/models", expect.objectContaining({ method: "GET" }));
  });

  it("returns the original complete upstream list when explicitly requested", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(payload)),
    );
    expect(await executors["minimax.list_models"]!({ include_legacy: true }, context("global"))).toEqual({
      ok: true,
      output: payload,
    });
  });

  it("does not invent unavailable models", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [{ id: "MiniMax-M3" }] })),
    );
    expect(await executors["minimax.list_models"]!({}, context("global"))).toEqual({
      ok: true,
      output: { data: [{ id: "MiniMax-M3" }] },
    });
  });

  it("retrieves explicit legacy IDs unchanged", async () => {
    const fetch = vi.fn(async () => Response.json({ id: "MiniMax-M2.7" }));
    vi.stubGlobal("fetch", fetch);
    expect(await executors["minimax.retrieve_model"]!({ modelId: "MiniMax-M2.7" }, context("china"))).toEqual({
      ok: true,
      output: { id: "MiniMax-M2.7" },
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.minimaxi.com/v1/models/MiniMax-M2.7",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
