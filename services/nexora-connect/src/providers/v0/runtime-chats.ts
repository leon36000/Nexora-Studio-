import type { V0ActionInput } from "./runtime-client.ts";

import { compactObject } from "../../core/cast.ts";
import {
  normalizeDeletedResource,
  normalizeFavoriteStatus,
  normalizeChat,
  normalizeListData,
  normalizeMessage,
  normalizePagination,
  normalizeVersion,
  optionalInputBoolean,
  optionalInputNumber,
  optionalInputObject,
  optionalInputString,
  optionalInputStringArray,
  requireAtLeastOneInputField,
  requireInputBoolean,
  requireInputObjectArray,
  requireInputString,
  requestV0Json,
  toQueryString,
} from "./runtime-client.ts";

export async function v0CreateChat(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/chats",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: compactObject({
      message: requireInputString(input.input.message, "message"),
      projectId: optionalInputString(input.input.projectId),
      chatPrivacy: optionalInputString(input.input.chatPrivacy),
      responseMode: optionalInputString(input.input.responseMode),
      metadata: optionalInputObject(input.input.metadata),
      modelId: optionalInputString(input.input.modelId),
      modelConfiguration: optionalInputObject(input.input.modelConfiguration),
      designSystemId: optionalInputString(input.input.designSystemId),
      mcpServerIds: optionalInputStringArray(input.input.mcpServerIds),
      attachedSkillIds: optionalInputStringArray(input.input.attachedSkillIds),
      action: optionalInputObject(input.input.action),
    }),
  });

  return {
    chat: normalizeChat(payload),
  };
}

export async function v0InitChat(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/chats/init",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: compactObject({
      name: optionalInputString(input.input.name),
      projectId: optionalInputString(input.input.projectId),
      type: requireInputString(input.input.type, "type"),
      files: optionalObjectArray(input.input.files),
      repo: optionalInputObject(input.input.repo),
      registry: optionalInputObject(input.input.registry),
      zip: optionalInputObject(input.input.zip),
      templateId: optionalInputString(input.input.templateId),
      chatPrivacy: optionalInputString(input.input.chatPrivacy),
      metadata: optionalInputObject(input.input.metadata),
    }),
  });

  return {
    chat: normalizeChat(payload),
  };
}

export async function v0SendMessage(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/messages`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: compactObject({
      message: requireInputString(input.input.message, "message"),
      responseMode: optionalInputString(input.input.responseMode),
      system: optionalInputString(input.input.system),
      attachments: optionalObjectArray(input.input.attachments),
      modelId: optionalInputString(input.input.modelId),
      modelConfiguration: optionalInputObject(input.input.modelConfiguration),
      mcpServerIds: optionalInputStringArray(input.input.mcpServerIds),
      attachedSkillIds: optionalInputStringArray(input.input.attachedSkillIds),
      action: optionalInputObject(input.input.action),
    }),
  });

  return {
    chat: normalizeChat(payload),
  };
}

export async function v0FindChats(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const payload = await requestV0Json<Record<string, unknown>>({
    path: "/v1/chats",
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    query: compactObject({
      projectId: optionalInputString(input.input.projectId),
      vercelProjectId: optionalInputString(input.input.vercelProjectId),
      branch: optionalInputString(input.input.branch),
      limit: toQueryString(optionalInputNumber(input.input.limit)),
      offset: toQueryString(optionalInputNumber(input.input.offset)),
      isFavorite: toQueryString(optionalInputBoolean(input.input.isFavorite)),
    }),
  });

  return compactObject({
    chats: normalizeListData(payload).map((chat) => normalizeChat(chat)),
    pagination: normalizePagination(payload),
  });
}

export async function v0GetChat(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    notFoundCode: "app_not_found",
  });

  return {
    chat: normalizeChat(payload),
  };
}

export async function v0UpdateChat(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  requireAtLeastOneInputField(input.input, ["name", "privacy"]);
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "PATCH",
    body: compactObject({
      name: optionalInputString(input.input.name),
      privacy: optionalInputString(input.input.privacy),
    }),
    notFoundCode: "app_not_found",
  });

  return {
    chat: normalizeChat(payload),
  };
}

export async function v0FavoriteChat(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/favorite`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "PUT",
    body: {
      isFavorite: requireInputBoolean(input.input.isFavorite, "isFavorite"),
    },
    notFoundCode: "app_not_found",
  });

  return {
    favorite: normalizeFavoriteStatus(payload),
  };
}

export async function v0ForkChat(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/fork`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    body: compactObject({
      privacy: optionalInputString(input.input.privacy),
      versionId: optionalInputString(input.input.versionId),
    }),
    notFoundCode: "app_not_found",
  });

  return {
    chat: normalizeChat(payload),
  };
}

export async function v0DeleteChat(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "DELETE",
    notFoundCode: "app_not_found",
  });

  return {
    deletedChat: normalizeDeletedResource(payload, "chat"),
  };
}

export async function v0FindMessages(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/messages`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    query: compactObject({
      limit: toQueryString(optionalInputNumber(input.input.limit)),
      cursor: optionalInputString(input.input.cursor),
    }),
  });

  return compactObject({
    messages: normalizeListData(payload).map((message) => normalizeMessage(message)),
    pagination: normalizePagination(payload),
  });
}

export async function v0GetMessage(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const messageId = requireInputString(input.input.messageId, "messageId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    notFoundCode: "app_not_found",
  });

  return {
    message: normalizeMessage(payload),
  };
}

export async function v0ResumeMessage(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const messageId = requireInputString(input.input.messageId, "messageId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/resume`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "POST",
    notFoundCode: "app_not_found",
  });

  return {
    message: normalizeMessage(payload),
  };
}

export async function v0FindVersions(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/versions`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    query: compactObject({
      limit: toQueryString(optionalInputNumber(input.input.limit)),
      cursor: optionalInputString(input.input.cursor),
    }),
  });

  return compactObject({
    versions: normalizeListData(payload).map((version) => normalizeVersion(version)),
    pagination: normalizePagination(payload),
  });
}

export async function v0GetVersion(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const versionId = requireInputString(input.input.versionId, "versionId");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/versions/${encodeURIComponent(versionId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    query: compactObject({
      includeDefaultFiles: toQueryString(optionalInputBoolean(input.input.includeDefaultFiles)),
    }),
    notFoundCode: "app_not_found",
  });

  return {
    version: normalizeVersion(payload),
  };
}

export async function v0UpdateVersion(input: V0ActionInput, fetcher: typeof fetch): Promise<unknown> {
  const chatId = requireInputString(input.input.chatId, "chatId");
  const versionId = requireInputString(input.input.versionId, "versionId");
  const files = requireInputObjectArray(input.input.files, "files");
  const payload = await requestV0Json<Record<string, unknown>>({
    path: `/v1/chats/${encodeURIComponent(chatId)}/versions/${encodeURIComponent(versionId)}`,
    apiKey: input.apiKey,
    fetcher,
    mode: "execute",
    method: "PATCH",
    body: {
      files,
    },
    notFoundCode: "app_not_found",
  });

  return {
    version: normalizeVersion(payload),
  };
}

function optionalObjectArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {};
    }
    return item as Record<string, unknown>;
  });
}
