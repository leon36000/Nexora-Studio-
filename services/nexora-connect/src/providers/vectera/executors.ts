import type { CredentialValidators, ProviderExecutors, ProviderProxyExecutor } from "../../core/types.ts";

import { defineApiKeyProviderExecutors, defineProviderProxy } from "../provider-runtime.ts";
import { validateVecteraCredential, vecteraActionHandlers, vecteraApiBaseUrl } from "./runtime.ts";

const service = "vectera";

export const executors: ProviderExecutors = defineApiKeyProviderExecutors(service, vecteraActionHandlers, {
  skipDnsValidation: true,
});

export const proxy: ProviderProxyExecutor = defineProviderProxy({
  service,
  baseUrl: vecteraApiBaseUrl,
  auth: { type: "api_key_authorization", prefix: "Token " },
  skipDnsValidation: true,
});

export const credentialValidators: CredentialValidators = {
  apiKey: validateVecteraCredential,
};
