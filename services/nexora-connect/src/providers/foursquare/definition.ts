import type { ProviderDefinition } from "../../core/types.ts";

import { foursquareActions } from "./actions.ts";

const service = "foursquare";

/**
 * Foursquare Places API provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Foursquare",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "FSQ_API_KEY",
      description:
        "Foursquare Places API key used with the Authorization: fsq3 <api_key> header. Generate or revoke it from your project API Keys page: https://docs.foursquare.com/developer/docs/manage-api-keys",
    },
  ],
  homepageUrl: "https://foursquare.com",
  actions: foursquareActions,
};
