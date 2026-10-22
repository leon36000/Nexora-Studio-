import type { ProviderDefinition } from "../../core/types.ts";

import { genderizeActions } from "./actions.ts";

const service = "genderize";

/**
 * Genderize name prediction provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Genderize",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GENDERIZE_API_KEY",
      description:
        "Genderize API key passed with the apikey query parameter. Sign up for a free key at https://genderize.io/register and manage it from https://genderize.io/store.",
    },
  ],
  homepageUrl: "https://genderize.io/",
  actions: genderizeActions,
};
