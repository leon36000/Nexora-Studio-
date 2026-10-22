import type { HuggingfaceActionContext } from "./runtime.shared.ts";

import {
  compactObject,
  optionalBoolean,
  optionalIntegerLike,
  optionalRecord,
  optionalString,
  requiredString,
} from "../../core/cast.ts";
import { ProviderRequestError } from "../provider-runtime.ts";
import {
  asRecord,
  huggingfaceRequestJson,
  optionalGated,
  optionalStringArray,
  requireProviderArray,
} from "./runtime.shared.ts";

const huggingfaceHubSpacesUrl = "https://huggingface.co/api/spaces";

export async function listHuggingfaceSpaces(
  input: Record<string, unknown>,
  context: HuggingfaceActionContext,
): Promise<unknown> {
  const payload = await huggingfaceRequestJson<unknown[]>({
    ...context,
    url: huggingfaceHubSpacesUrl,
    query: compactObject({
      search: optionalString(input.search),
      author: optionalString(input.author),
      filter: optionalString(input.filter),
      sort: optionalString(input.sort),
      direction: optionalString(input.direction),
      limit: optionalIntegerLike(input.limit, "limit", (message) => new ProviderRequestError(400, message)),
    }),
  });

  return {
    spaces: requireProviderArray(payload, "huggingface spaces").map((item) =>
      normalizeHuggingfaceSpaceSummary(asRecord(item)),
    ),
  };
}

export async function getHuggingfaceSpaceInfo(
  input: Record<string, unknown>,
  context: HuggingfaceActionContext,
): Promise<unknown> {
  const repoId = requiredString(input.repoId, "repoId", (message) => new ProviderRequestError(400, message));
  const payload = await huggingfaceRequestJson<Record<string, unknown>>({
    ...context,
    url: `${huggingfaceHubSpacesUrl}/${repoId}`,
    query: compactObject({
      revision: optionalString(input.revision),
    }),
  });

  return normalizeHuggingfaceSpaceSummary(payload);
}

export async function listHuggingfaceRepoFiles(
  input: Record<string, unknown>,
  context: HuggingfaceActionContext,
): Promise<unknown> {
  const repoType = requiredString(input.repoType, "repoType", (message) => new ProviderRequestError(400, message));
  const repoId = requiredString(input.repoId, "repoId", (message) => new ProviderRequestError(400, message));
  const revision = optionalString(input.revision) ?? "main";
  const path = normalizeRepoTreePath(optionalString(input.path));
  const payload = await huggingfaceRequestJson<Record<string, unknown> | unknown[]>({
    ...context,
    url: buildRepoTreeUrl(mapRepoTypePath(repoType), repoId, revision, path),
    query: compactObject({
      expand: optionalBoolean(input.expand),
      limit: optionalIntegerLike(input.limit, "limit", (message) => new ProviderRequestError(400, message)),
      recursive: optionalBoolean(input.recursive),
      cursor: optionalString(input.cursor),
    }),
  });

  const objectPayload = Array.isArray(payload) ? undefined : optionalRecord(payload);
  const itemsSource = Array.isArray(payload)
    ? payload
    : requireProviderArray(objectPayload?.items, "huggingface repo tree items");

  return compactObject({
    items: itemsSource.map((item) => normalizeRepoTreeItem(asRecord(item))),
    nextCursor: objectPayload ? optionalString(objectPayload.nextCursor) : undefined,
  });
}

function normalizeHuggingfaceSpaceSummary(payload: Record<string, unknown>): Record<string, unknown> {
  return compactObject({
    id: optionalString(payload.id),
    author: optionalString(payload.author),
    sdk: optionalString(payload.sdk),
    host: optionalString(payload.host),
    private: optionalBoolean(payload.private),
    gated: optionalGated(payload.gated),
    likes: optionalIntegerLike(payload.likes, "likes", (message) => new ProviderRequestError(502, message)),
    models: optionalStringArray(payload.models),
    datasets: optionalStringArray(payload.datasets),
    tags: optionalStringArray(payload.tags),
    createdAt: optionalString(payload.createdAt) ?? optionalString(payload.created_at),
    lastModified: optionalString(payload.lastModified) ?? optionalString(payload.last_modified),
    runtime: optionalRecord(payload.runtime),
    cardData: optionalRecord(payload.cardData),
  });
}

function normalizeRepoTreeItem(payload: Record<string, unknown>): Record<string, unknown> {
  return compactObject({
    path: optionalString(payload.path),
    type: optionalString(payload.type),
    oid: optionalString(payload.oid),
    size: optionalIntegerLike(payload.size, "size", (message) => new ProviderRequestError(502, message)),
    lastCommit: optionalRecord(payload.lastCommit),
    securityFileStatus: optionalRecord(payload.securityFileStatus),
  });
}

function mapRepoTypePath(repoType: string): string {
  switch (repoType) {
    case "model":
      return "models";
    case "dataset":
      return "datasets";
    case "space":
      return "spaces";
    default:
      return `${repoType}s`;
  }
}

function normalizeRepoTreePath(path: string | undefined): string {
  if (!path || path === ".") {
    return "";
  }

  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildRepoTreeUrl(repoTypePath: string, repoId: string, revision: string, path: string): string {
  const baseUrl = `https://huggingface.co/api/${repoTypePath}/${repoId}/tree/${encodeURIComponent(revision)}`;
  return path.length > 0 ? `${baseUrl}/${path}` : baseUrl;
}
