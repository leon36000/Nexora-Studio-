import type { ProviderDefinition } from "../../core/types.ts";

import { ambivoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "ambivo",
  displayName: "Ambivo",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "AMBIVO_API_TOKEN",
      description:
        "Ambivo API token used in the Authorization header with the Bearer scheme. Generate and view integration tokens in your Ambivo account integrations page: https://account.ambivo.com/integrations.",
    },
  ],
  homepageUrl: "https://www.ambivo.com/",
  actions: ambivoActions,
};
