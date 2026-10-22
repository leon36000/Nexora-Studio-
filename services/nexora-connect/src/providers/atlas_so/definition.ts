import type { ProviderDefinition } from "../../core/types.ts";

import { atlasSoActions } from "./actions.ts";

const service = "atlas_so";

export const provider: ProviderDefinition = {
  service,
  displayName: "Atlas.so",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "atlas_api_key",
      description:
        "Atlas.so API key sent as an Authorization Bearer token. Find it in Atlas under App Config > API: https://app.getatlas.io/configuration/external-api.",
    },
  ],
  homepageUrl: "https://atlas.so",
  actions: atlasSoActions,
};
