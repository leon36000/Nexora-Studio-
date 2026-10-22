import type { HuggingfaceActionContext } from "./runtime.shared.ts";

import { compactObject, optionalIntegerLike, optionalRecord, optionalString, requiredString } from "../../core/cast.ts";
import { ProviderRequestError } from "../provider-runtime.ts";
import { asRecord, huggingfaceRequestJson, requireProviderArray } from "./runtime.shared.ts";

const huggingfaceTrendingUrl = "https://huggingface.co/api/trending";
const huggingfaceEndpointsBaseUrl = "https://api.endpoints.huggingface.cloud/v2/endpoints";

export async function getHuggingfaceTrending(
  input: Record<string, unknown>,
  context: HuggingfaceActionContext,
): Promise<unknown> {
  const payload = await huggingfaceRequestJson<Record<string, unknown> | unknown[]>({
    ...context,
    url: huggingfaceTrendingUrl,
    query: compactObject({
      type: optionalString(input.type),
      limit: optionalIntegerLike(input.limit, "limit", (message) => new ProviderRequestError(400, message)),
    }),
  });

  const entries = Array.isArray(payload)
    ? payload
    : requireProviderArray(optionalRecord(payload)?.recentlyTrending, "huggingface trending entries");

  return {
    recentlyTrending: entries.map((item) => normalizeTrendingEntry(asRecord(item))),
  };
}

export async function listHuggingfaceEndpoints(
  input: Record<string, unknown>,
  context: HuggingfaceActionContext,
): Promise<unknown> {
  const namespace = requiredString(input.namespace, "namespace", (message) => new ProviderRequestError(400, message));
  const payload = await huggingfaceRequestJson<Record<string, unknown>>({
    ...context,
    url: `${huggingfaceEndpointsBaseUrl}/${namespace}`,
    query: compactObject({
      tags: optionalString(input.tags),
      limit: optionalIntegerLike(input.limit, "limit", (message) => new ProviderRequestError(400, message)),
      search: optionalString(input.search),
      cursor: optionalString(input.cursor),
    }),
  });

  return compactObject({
    items: requireProviderArray(payload.items, "huggingface endpoints").map((item) => asRecord(item)),
    nextCursor: optionalString(payload.nextCursor),
    prevCursor: optionalString(payload.prevCursor),
  });
}

function normalizeTrendingEntry(payload: Record<string, unknown>): Record<string, unknown> {
  return compactObject({
    repoType: optionalString(payload.repoType),
    repoData: optionalRecord(payload.repoData),
  });
}
