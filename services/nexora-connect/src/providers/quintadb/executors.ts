import type { CredentialValidators, ProviderExecutors, ProviderProxyExecutor } from "../../core/types.ts";

import { defineApiKeyProviderExecutors, defineProviderProxy } from "../provider-runtime.ts";
import { quintaDbActionHandlers, quintaDbApiBaseUrl, validateQuintaDbCredential } from "./runtime.ts";

const service = "quintadb";

export const executors: ProviderExecutors = defineApiKeyProviderExecutors(service, quintaDbActionHandlers, {
  skipDnsValidation: true,
});

export const proxy: ProviderProxyExecutor = defineProviderProxy({
  service,
  baseUrl: quintaDbApiBaseUrl,
  auth: { type: "api_key_query", name: "rest_api_key" },
  skipDnsValidation: true,
});

export const credentialValidators: CredentialValidators = {
  apiKey(input, { fetcher, signal }) {
    return validateQuintaDbCredential(input.apiKey, fetcher, signal);
  },
};
