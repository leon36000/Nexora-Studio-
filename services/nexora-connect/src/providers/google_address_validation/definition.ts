import type { ProviderDefinition } from "../../core/types.ts";

import { googleAddressValidationActions } from "./actions.ts";

const service = "google_address_validation";

export const provider: ProviderDefinition = {
  service,
  displayName: "Google Address Validation",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GOOGLE_MAPS_API_KEY",
      description:
        "Google Maps Platform API key used with the Address Validation API. Create or manage it in the Google Cloud Console: https://developers.google.com/maps/documentation/address-validation/use-address-validation-api",
      extraFields: [],
    },
  ],
  homepageUrl: "https://developers.google.com/maps/documentation/address-validation",
  actions: googleAddressValidationActions,
};
