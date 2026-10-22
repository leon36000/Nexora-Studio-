import type { ProviderDefinition } from "../../core/types.ts";

import { livesessionActions } from "./actions.ts";

const service = "livesession";

export const provider: ProviderDefinition = {
  service,
  displayName: "LiveSession",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "LIVESESSION_API_TOKEN",
      description:
        "LiveSession personal access token sent as Authorization: Bearer <token>. Create or view a token from the official API authentication docs: https://livesession.dev/docs/api/authentication.",
    },
  ],
  homepageUrl: "https://livesession.io",
  actions: livesessionActions,
};
