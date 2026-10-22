import type { ProviderDefinition } from "../../core/types.ts";

import { wpMapsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "wp_maps",
  displayName: "WP Maps",
  categories: ["Location", "Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Private Access Token",
      placeholder: "WP_MAPS_ACCESS_TOKEN",
      description:
        "WP Maps private access token sent as access_token. Generate it from Configuration > Access Token: https://wpmaps.com/help/generate-wp-maps-api-access-token/.",
      extraFields: [
        {
          key: "clientId",
          label: "Client ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "WP_MAPS_CLIENT_ID",
          description:
            "WP Maps client ID sent as client_id. View it alongside the access token in Configuration > Access Token.",
        },
      ],
    },
  ],
  homepageUrl: "https://wpmaps.com/",
  actions: wpMapsActions,
};
