import type { ProviderDefinition } from "../../core/types.ts";

import { mapboxActions } from "./actions.ts";

const service = "mapbox";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mapbox",
  categories: ["Location", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "pk.ey...",
      description:
        "Mapbox access token used with the access_token query parameter. Create or copy it from your Mapbox Access Tokens page: https://console.mapbox.com/account/access-tokens/.",
    },
  ],
  homepageUrl: "https://www.mapbox.com",
  actions: mapboxActions,
};
