import type { ProviderDefinition } from "../../core/types.ts";

import { needleActions } from "./actions.ts";

const service = "needle";

/**
 * Needle provider backed by the public Needle API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Needle",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ndl_...",
      description:
        "Needle API key used with the x-api-key header. Generate or manage it in Needle settings: https://needle.app/dashboard/settings.",
    },
  ],
  homepageUrl: "https://needle.app",
  actions: needleActions,
};
