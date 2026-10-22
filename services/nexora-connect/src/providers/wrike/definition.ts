import type { ProviderDefinition } from "../../core/types.ts";

import { wrikeActions } from "./actions.ts";

const service = "wrike";

export const provider: ProviderDefinition = {
  service,
  displayName: "Wrike",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Permanent Access Token",
      placeholder: "WRIKE_ACCESS_TOKEN",
      description:
        "Wrike permanent access token sent as an Authorization: Bearer header. Create it from your Wrike workspace profile under Apps & Integrations > API: https://developers.wrike.com/docs/mcp-legacy-authentication-pat.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.wrike.com",
  actions: wrikeActions,
};
