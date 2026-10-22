import type { ProviderDefinition } from "../../core/types.ts";

import { collegiateActions } from "./actions.ts";

const service = "collegiate";

/**
 * Merriam-Webster Collegiate provider backed by the public Dictionary API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Merriam-Webster Collegiate",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MERRIAM_WEBSTER_API_KEY",
      description:
        "Merriam-Webster Collegiate Dictionary API key passed as the key query parameter. Register for a Dictionary API account to get it: https://dictionaryapi.com/register/index",
    },
  ],
  homepageUrl: "https://www.merriam-webster.com",
  actions: collegiateActions,
};
