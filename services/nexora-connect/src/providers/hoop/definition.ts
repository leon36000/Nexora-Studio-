import type { ProviderDefinition } from "../../core/types.ts";

import { hoopActions } from "./actions.ts";

const service = "hoop";

/**
 * Hoop provider backed by the Hoop API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Hoop",
  categories: ["Security", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Hoop API Key",
      placeholder: "hpk_...",
      description: "Hoop managed API key used as a Bearer token.",
    },
  ],
  homepageUrl: "https://hoop.dev",
  actions: hoopActions,
};
