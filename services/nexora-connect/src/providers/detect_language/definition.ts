import type { ProviderDefinition } from "../../core/types.ts";

import { detectLanguageActions } from "./actions.ts";

const service = "detect_language";

/**
 * Detect Language provider backed by the Detect Language v3 REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Detect Language",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DETECT_LANGUAGE_API_KEY",
      description:
        "Detect Language uses this API key in the Authorization bearer header. Sign up and get the key from your Detect Language account: https://detectlanguage.com/users/sign_up.",
    },
  ],
  homepageUrl: "https://detectlanguage.com/",
  actions: detectLanguageActions,
};
