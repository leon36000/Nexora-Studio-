import type { CredentialValidators, ProviderExecutors, ProviderProxyExecutor } from "../../core/types.ts";

import { defineApiKeyProviderExecutors, defineProviderProxy } from "../provider-runtime.ts";
import { timelinesAiActionHandlers, timelinesAiApiBaseUrl, validateTimelinesAiCredential } from "./runtime.ts";

const service = "timelinesai";
export const executors: ProviderExecutors = defineApiKeyProviderExecutors(service, timelinesAiActionHandlers, {
  skipDnsValidation: true,
});
export const proxy: ProviderProxyExecutor = defineProviderProxy({
  service,
  baseUrl: timelinesAiApiBaseUrl,
  auth: { type: "api_key_authorization", prefix: "Bearer " },
  skipDnsValidation: true,
});
export const credentialValidators: CredentialValidators = {
  apiKey(input, { fetcher, signal }) {
    return validateTimelinesAiCredential(input.apiKey, fetcher, signal);
  },
};
