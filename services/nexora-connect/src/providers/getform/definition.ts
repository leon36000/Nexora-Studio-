import type { ProviderDefinition } from "../../core/types.ts";

import { getformActions } from "./actions.ts";

const service = "getform";

/**
 * Getform provider backed by the Forminit protected-mode API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Getform",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "fi_your_secret_api_key",
      description:
        "Forminit protected-mode API key sent with the X-API-KEY header. Create it from Account > API Tokens in the Forminit dashboard: https://forminit.com/docs/list-submissions-api/.",
    },
  ],
  homepageUrl: "https://forminit.com",
  actions: getformActions,
};
