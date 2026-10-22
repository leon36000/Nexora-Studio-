import type { ProviderDefinition } from "../../core/types.ts";

import { cratedbCloudActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "cratedb_cloud",
  displayName: "CrateDB Cloud",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Secret",
      placeholder: "CRATEDB_CLOUD_API_SECRET",
      description:
        "CrateDB Cloud API secret used as the HTTP Basic Auth password. Generate the API key and secret from your CrateDB Cloud account settings: https://console.cratedb.cloud/account/settings",
      extraFields: [
        {
          key: "key",
          label: "API Key",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "CRATEDB_CLOUD_API_KEY",
          description:
            "CrateDB Cloud API key used as the HTTP Basic Auth username. Generate it together with the API secret from your CrateDB Cloud account settings: https://console.cratedb.cloud/account/settings",
        },
      ],
    },
  ],
  homepageUrl: "https://cratedb.com/database/cloud",
  actions: cratedbCloudActions,
};
