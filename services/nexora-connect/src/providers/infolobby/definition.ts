import type { ProviderDefinition } from "../../core/types.ts";

import { infolobbyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "infolobby",
  displayName: "InfoLobby",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "il_live_... or il_user_...",
      description:
        "InfoLobby account or personal API key sent as a Bearer token. See https://infolobby.com/api-docs/authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://infolobby.com/",
  actions: infolobbyActions,
};
