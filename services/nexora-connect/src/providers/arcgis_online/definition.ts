import type { ProviderDefinition } from "../../core/types.ts";

import { arcgisOnlineActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "arcgis_online",
  displayName: "ArcGIS Online",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ARCGIS_ONLINE_API_KEY",
      description:
        "ArcGIS API key used as an access token for ArcGIS Location Services. Create API key credentials in your ArcGIS portal: https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/tutorials/create-an-api-key/location-platform/.",
    },
  ],
  homepageUrl: "https://www.arcgis.com",
  actions: arcgisOnlineActions,
};
