import type { ProviderDefinition } from "../../core/types.ts";

import { parmaActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "parma",
  displayName: "Parma",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "PARMA_API_TOKEN",
      description: "Parma workspace API token. Copy or create one at https://app.parma.ai/api.",
    },
  ],
  homepageUrl: "https://parma.ai",
  actions: parmaActions,
};
