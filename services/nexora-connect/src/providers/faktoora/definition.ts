import type { ProviderDefinition } from "../../core/types.ts";

import { faktooraActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "faktoora",
  displayName: "Faktoora",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "FAKTOORA_API_KEY",
      description:
        "Faktoora API key sent in the X-API-KEY header. See https://docs.faktoora.com/docs/glossary/#api-key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://faktoora.com/",
  actions: faktooraActions,
};
