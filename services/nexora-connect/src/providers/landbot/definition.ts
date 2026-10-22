import type { ProviderDefinition } from "../../core/types.ts";

import { landbotActions } from "./actions.ts";

const service = "landbot";

/**
 * Landbot provider backed by the Landbot Platform API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Landbot",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Agent Token",
      placeholder: "landbot_agent_token",
      description:
        "Landbot agent token sent as Authorization: Token <token> for the Platform API. Find it in Settings > Account in the Landbot dashboard: https://app.landbot.io/gui/settings/account.",
    },
  ],
  homepageUrl: "https://landbot.io",
  actions: landbotActions,
};
