import type { ProviderDefinition } from "../../core/types.ts";

import { centralStationCrmActions } from "./actions.ts";

const service = "central_station_crm";

export const provider: ProviderDefinition = {
  service,
  displayName: "CentralStationCRM",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CENTRALSTATIONCRM_API_KEY",
      description:
        "CentralStationCRM API key sent with the X-apikey header. Create or view API keys under Account settings > API: https://centralstationcrm.com/api-basics.",
      extraFields: [
        {
          key: "account",
          label: "Account",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "acme",
          description:
            "Your CentralStationCRM account subdomain from https://{account}.centralstationcrm.net. You can enter either the subdomain or the full account URL.",
        },
      ],
    },
  ],
  homepageUrl: "https://centralstationcrm.de",
  actions: centralStationCrmActions,
};
