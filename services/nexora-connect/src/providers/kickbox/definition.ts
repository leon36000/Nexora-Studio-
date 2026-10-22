import type { ProviderDefinition } from "../../core/types.ts";

import { kickboxActions } from "./actions.ts";

const service = "kickbox";

/**
 * Kickbox provider backed by the public Kickbox email verification APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Kickbox",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KICKBOX_API_KEY",
      description:
        "Kickbox API key passed with the apikey query parameter. Find it on the account keys settings page: https://app.kickbox.com/accounts/<accountId>/settings/keys",
    },
  ],
  homepageUrl: "https://kickbox.com/",
  actions: kickboxActions,
};
