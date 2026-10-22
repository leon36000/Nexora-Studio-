import type { ProviderDefinition } from "../../core/types.ts";

import { kernelActions } from "./actions.ts";

const service = "kernel";

/**
 * Kernel provider backed by the public Kernel API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Kernel",
  categories: ["Developer Tools", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KERNEL_API_KEY",
      description:
        "Kernel API key sent as a bearer token. Create, view, and rotate keys from Kernel API Keys: https://kernel.sh/docs/info/api-keys.",
    },
  ],
  homepageUrl: "https://kernel.sh",
  actions: kernelActions,
};
