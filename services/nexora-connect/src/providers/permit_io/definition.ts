import type { ProviderDefinition } from "../../core/types.ts";

import { permitIoActions } from "./actions.ts";

const service = "permit_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "Permit.io",
  categories: ["Developer Tools", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "permit_key_...",
      description:
        "Permit.io API key sent as a Bearer token. Copy an environment key from the Projects screen or active environment menu at https://app.permit.io.",
    },
  ],
  homepageUrl: "https://www.permit.io",
  actions: permitIoActions,
};
