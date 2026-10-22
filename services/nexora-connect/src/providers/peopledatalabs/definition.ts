import type { ProviderDefinition } from "../../core/types.ts";

import { peopledatalabsActions } from "./actions.ts";

const service = "peopledatalabs";

export const provider: ProviderDefinition = {
  service,
  displayName: "People Data Labs",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PDL_API_KEY",
      description:
        "People Data Labs API key used with the X-Api-Key header. Create and manage API keys in the People Data Labs API Dashboard: https://dashboard.peopledatalabs.com.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.peopledatalabs.com",
  actions: peopledatalabsActions,
};
