import type { V0ActionInput } from "./runtime-client.ts";

import { compactObject } from "../../core/cast.ts";
import {
  normalizeAssignment,
  normalizeDeletedResource,
  normalizeEnvVar,
  normalizeHook,
  normalizeListData,
  normalizeObjectData,
  normalizePagination,
  normalizeProject,
  normalizeVercelProject,
  requireAtLeastOneInputField,
  optionalInputBoolean,
  optionalInputNumber,
  optionalInputString,
  optionalInputStringArray,
  requireInputObjectArray,
  requireInputString,
  requireInputStringArray,
  requestV0Json,
  toQueryString,
} from "./runtime-client.ts";

export async function v0FindProjects(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/projects",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    query: compactObject({
      limit: toQueryString(optionalInputNumber(input.input.limit)),
      offset: toQueryString(optionalInputNumber(input.input.offset)),
    }),
  });

  return compactObject({
    projects: normalizeListData(payload).map((project) => normalizeProject(project)),
    pagination: normalizePagination(payload),
  });
}

export async function v0CreateProject(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/projects",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: compactObject({
      name: requireInputString(input.input.name, "name"),
      description: optionalInputString(input.input.description),
      icon: optionalInputString(input.input.icon),
      instructions: optionalInputString(input.input.instructions),
      privacy: optionalInputString(input.input.privacy),
      vercelProjectId: optionalInputString(input.input.vercelProjectId),
      environmentVariables: optionalObjectArray(input.input.environmentVariables),
    }),
  });

  return {
    project: normalizeProject(payload),
  };
}

export async function v0GetProject(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const projectId = requireInputString(input.input.projectId, "projectId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/projects/${encodeURIComponent(projectId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    notFoundCode: "app_not_found",
  });

  return {
    project: normalizeProject(payload),
  };
}

export async function v0UpdateProject(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const projectId = requireInputString(input.input.projectId, "projectId");
  requireAtLeastOneInputField(input.input, [
    "name",
    "description",
    "icon",
    "instructions",
    "privacy",
    "vercelProjectId",
  ]);
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/projects/${encodeURIComponent(projectId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "PATCH",
    body: compactObject({
      name: optionalInputString(input.input.name),
      description: optionalInputString(input.input.description),
      icon: optionalInputString(input.input.icon),
      instructions: optionalInputString(input.input.instructions),
      privacy: optionalInputString(input.input.privacy),
      vercelProjectId: optionalInputString(input.input.vercelProjectId),
    }),
    notFoundCode: "app_not_found",
  });

  return {
    project: normalizeProject(payload),
  };
}

export async function v0GetProjectByChat(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/project`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    notFoundCode: "app_not_found",
  });

  return {
    project: normalizeProject(payload),
  };
}

export async function v0AssignProjectToChat(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const projectId = requireInputString(input.input.projectId, "projectId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/projects/${encodeURIComponent(projectId)}/assign`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: {
      chatId: requireInputString(input.input.chatId, "chatId"),
    },
    notFoundCode: "app_not_found",
  });

  return {
    assignment: normalizeAssignment(payload),
  };
}

export async function v0DeleteProject(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const projectId = requireInputString(input.input.projectId, "projectId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/projects/${encodeURIComponent(projectId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "DELETE",
    notFoundCode: "app_not_found",
  });

  return {
    deletedProject: normalizeDeletedResource(payload, "project"),
  };
}

export async function v0FindEnvVars(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const projectId = requireInputString(input.input.projectId, "projectId");
  const decrypted = optionalInputBoolean(input.input.decrypted);
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/projects/${encodeURIComponent(projectId)}/env-vars`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    query: compactObject({
      decrypted: toQueryString(decrypted),
    }),
  });

  return {
    envVars: normalizeListData(payload).map((envVar) => normalizeEnvVar(envVar)),
  };
}

export async function v0GetEnvVar(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const projectId = requireInputString(input.input.projectId, "projectId");
  const environmentVariableId = requireInputString(input.input.environmentVariableId, "environmentVariableId");
  const decrypted = optionalInputBoolean(input.input.decrypted);
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/projects/${encodeURIComponent(projectId)}/env-vars/${encodeURIComponent(environmentVariableId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    query: compactObject({
      decrypted: toQueryString(decrypted),
    }),
    notFoundCode: "app_not_found",
  });

  return {
    envVar: normalizeEnvVar(normalizeObjectData(payload)),
  };
}

export async function v0CreateEnvVars(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const projectId = requireInputString(input.input.projectId, "projectId");
  const environmentVariables = requireInputObjectArray(input.input.environmentVariables, "environmentVariables");
  const decrypted = optionalInputBoolean(input.input.decrypted);
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/projects/${encodeURIComponent(projectId)}/env-vars`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    query: compactObject({
      decrypted: toQueryString(decrypted),
    }),
    body: compactObject({
      environmentVariables,
      upsert: optionalInputBoolean(input.input.upsert),
    }),
  });

  return {
    envVars: normalizeListData(payload).map((envVar) => normalizeEnvVar(envVar)),
  };
}

export async function v0UpdateEnvVars(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const projectId = requireInputString(input.input.projectId, "projectId");
  const environmentVariables = requireInputObjectArray(input.input.environmentVariables, "environmentVariables");
  const decrypted = optionalInputBoolean(input.input.decrypted);
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/projects/${encodeURIComponent(projectId)}/env-vars`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "PATCH",
    query: compactObject({
      decrypted: toQueryString(decrypted),
    }),
    body: {
      environmentVariables,
    },
  });

  return {
    envVars: normalizeListData(payload).map((envVar) => normalizeEnvVar(envVar)),
  };
}

export async function v0DeleteEnvVars(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const projectId = requireInputString(input.input.projectId, "projectId");
  const environmentVariableIds = requireInputStringArray(input.input.environmentVariableIds, "environmentVariableIds");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/projects/${encodeURIComponent(projectId)}/env-vars/delete`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: {
      environmentVariableIds,
    },
  });

  return {
    deletedEnvVars: normalizeListData(payload).map((envVar) => normalizeEnvVar(envVar)),
  };
}

export async function v0FindHooks(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/hooks",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
  });

  return {
    hooks: normalizeListData(payload).map((hook) => normalizeHook(hook)),
  };
}

export async function v0CreateHook(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/hooks",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: compactObject({
      name: requireInputString(input.input.name, "name"),
      url: requireInputString(input.input.url, "url"),
      events: requireInputStringArray(input.input.events, "events"),
      chatId: optionalInputString(input.input.chatId),
      projectId: optionalInputString(input.input.projectId),
    }),
  });

  return {
    hook: normalizeHook(payload),
  };
}

export async function v0GetHook(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const hookId = requireInputString(input.input.hookId, "hookId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/hooks/${encodeURIComponent(hookId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    notFoundCode: "app_not_found",
  });

  return {
    hook: normalizeHook(payload),
  };
}

export async function v0UpdateHook(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const hookId = requireInputString(input.input.hookId, "hookId");
  requireAtLeastOneInputField(input.input, ["name", "url", "events"]);
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/hooks/${encodeURIComponent(hookId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "PATCH",
    body: compactObject({
      name: optionalInputString(input.input.name),
      url: optionalInputString(input.input.url),
      events: optionalInputStringArray(input.input.events),
    }),
    notFoundCode: "app_not_found",
  });

  return {
    hook: normalizeHook(payload),
  };
}

export async function v0DeleteHook(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const hookId = requireInputString(input.input.hookId, "hookId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/hooks/${encodeURIComponent(hookId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "DELETE",
    notFoundCode: "app_not_found",
  });

  return {
    deletedHook: normalizeDeletedResource(payload, "hook"),
  };
}

export async function v0CreateVercelProject(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/integrations/vercel/projects",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: {
      projectId: requireInputString(input.input.projectId, "projectId"),
      name: requireInputString(input.input.name, "name"),
    },
  });

  return {
    vercelProject: normalizeVercelProject(payload),
  };
}

export async function v0FindVercelProjects(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/integrations/vercel/projects",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
  });

  return {
    vercelProjects: normalizeListData(payload).map((project) => normalizeVercelProject(project)),
  };
}

function optionalObjectArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map((item) => normalizeObjectData(item));
}
