import type { CredentialValidators, ProviderExecutors, ProviderProxyExecutor } from "../../core/types.ts";

import { defineApiKeyProviderExecutors, defineProviderProxy } from "../provider-runtime.ts";
import { automActionHandlers, automApiBaseUrl, validateAutomCredential } from "./runtime.ts";

const service = "autom";

export const executors: ProviderExecutors = defineApiKeyProviderExecutors(service, automActionHandlers);

export const credentialValidators: CredentialValidators = {
  apiKey(input, { fetcher, signal }) {
    return validateAutomCredential(input.apiKey, fetcher, signal);
  },
};

export const proxy: ProviderProxyExecutor = defineProviderProxy({
  service,
  baseUrl: automApiBaseUrl,
  auth: { type: "api_key_header", name: "x-api-key" },
});
