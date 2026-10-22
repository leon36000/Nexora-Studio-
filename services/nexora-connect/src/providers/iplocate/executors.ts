import type { CredentialValidators, ProviderExecutors, ProviderProxyExecutor } from "../../core/types.ts";

import { defineApiKeyProviderExecutors, defineProviderProxy } from "../provider-runtime.ts";
import { iplocateActionHandlers, iplocateApiBaseUrl, validateIplocateCredential } from "./runtime.ts";

const service = "iplocate";

export const executors: ProviderExecutors = defineApiKeyProviderExecutors(service, iplocateActionHandlers);

export const credentialValidators: CredentialValidators = {
  apiKey(input, { fetcher, signal }) {
    return validateIplocateCredential(input.apiKey, fetcher, signal);
  },
};

export const proxy: ProviderProxyExecutor = defineProviderProxy({
  service,
  baseUrl: iplocateApiBaseUrl,
  auth: { type: "api_key_header", name: "X-API-Key" },
});
