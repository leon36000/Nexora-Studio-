import type { ProviderDefinition } from "../../core/types.ts";

import { postmanActions } from "./actions.ts";

const service = "postman";

/**
 * Postman provider backed by the Postman public API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Postman",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API key",
      placeholder: "PMAK-...",
      description:
        "Postman API key used with the X-API-Key header. Generate it from Postman account settings under API keys.",
    },
  ],
  homepageUrl: "https://www.postman.com",
  actions: postmanActions,
};
