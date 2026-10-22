import type { ProviderExecutors, ProviderProxyExecutor } from "../../core/types.ts";
import type { GreynoiseRuntimeContext } from "./runtime.ts";

import { defineProviderExecutors, defineProviderProxy } from "../provider-runtime.ts";
import { greynoiseActionHandlers, greynoiseApiBaseUrl } from "./runtime.ts";

const service = "greynoise";

export const executors: ProviderExecutors = defineProviderExecutors<GreynoiseRuntimeContext>({
  service,
  handlers: greynoiseActionHandlers,
  skipDnsValidation: true,
  createContext(context, fetcher): GreynoiseRuntimeContext {
    return { fetcher, signal: context.signal };
  },
});

export const proxy: ProviderProxyExecutor = defineProviderProxy({
  service,
  baseUrl: greynoiseApiBaseUrl,
  auth: { type: "none" },
  skipDnsValidation: true,
});
