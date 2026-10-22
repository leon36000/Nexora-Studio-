import type { V0ActionInput } from "./runtime-client.ts";

import { compactObject } from "../../core/cast.ts";
import {
  normalizeDeployment,
  normalizeDeploymentErrors,
  normalizeDeploymentLog,
  normalizeListData,
  optionalInputNumber,
  requireInputString,
  requestV0Json,
  toQueryString,
} from "./runtime-client.ts";

export async function v0CreateDeployment(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/deployments",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: {
      projectId: requireInputString(input.input.projectId, "projectId"),
      chatId: requireInputString(input.input.chatId, "chatId"),
      versionId: requireInputString(input.input.versionId, "versionId"),
    },
  });

  return {
    deployment: normalizeDeployment(payload),
  };
}

export async function v0FindDeployments(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/deployments",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    query: compactObject({
      projectId: requireInputString(input.input.projectId, "projectId"),
      chatId: requireInputString(input.input.chatId, "chatId"),
      versionId: requireInputString(input.input.versionId, "versionId"),
    }),
  });

  return {
    deployments: normalizeListData(payload).map((deployment) => normalizeDeployment(deployment)),
  };
}

export async function v0GetDeployment(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const deploymentId = requireInputString(input.input.deploymentId, "deploymentId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/deployments/${encodeURIComponent(deploymentId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    notFoundCode: "app_not_found",
  });

  return {
    deployment: normalizeDeployment(payload),
  };
}

export async function v0FindDeploymentLogs(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const deploymentId = requireInputString(input.input.deploymentId, "deploymentId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/deployments/${encodeURIComponent(deploymentId)}/logs`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    query: compactObject({
      since: toQueryString(optionalInputNumber(input.input.since)),
    }),
    notFoundCode: "app_not_found",
  });

  const nextSince = normalizeObjectData(payload).nextSince;
  const logs = Array.isArray(payload.logs) ? payload.logs : normalizeListData(payload);

  return compactObject({
    logs: logs.map((log) => normalizeDeploymentLog(log)),
    nextSince: typeof nextSince === "number" ? nextSince : undefined,
  });
}

export async function v0FindDeploymentErrors(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const deploymentId = requireInputString(input.input.deploymentId, "deploymentId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/deployments/${encodeURIComponent(deploymentId)}/errors`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    notFoundCode: "app_not_found",
  });

  return {
    errors: normalizeDeploymentErrors(payload),
  };
}

function normalizeObjectData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const data = record.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return record;
}
