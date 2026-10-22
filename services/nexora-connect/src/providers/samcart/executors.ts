import type { CredentialValidators, ProviderExecutors, ProviderProxyExecutor } from "../../core/types.ts";

import { defineApiKeyProviderExecutors, defineProviderProxy } from "../provider-runtime.ts";
import { samcartActionHandlers, samcartApiBaseUrl, validateSamcartApiKey } from "./runtime.ts";

export const executors: ProviderExecutors = defineApiKeyProviderExecutors("samcart", samcartActionHandlers, {
  skipDnsValidation: true,
});
export const proxy: ProviderProxyExecutor = defineProviderProxy({
  service: "samcart",
  baseUrl: samcartApiBaseUrl,
  auth: { type: "api_key_header", name: "sc-api" },
  skipDnsValidation: true,
});
export const credentialValidators: CredentialValidators = {
  apiKey(input, { fetcher, signal }) {
    return validateSamcartApiKey({ apiKey: input.apiKey, fetcher, signal });
  },
};
