import type { ProviderDefinition } from "../../core/types.ts";

import { nutrientDocumentWebServicesApiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "nutrient_document_web_services_api",
  displayName: "Nutrient DWS",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "NUTRIENT_DWS_API_KEY",
      description:
        "Nutrient DWS Processor API key sent as a Bearer token. Create or view keys from the Nutrient dashboard: https://dashboard.nutrient.io/.",
    },
  ],
  homepageUrl: "https://www.nutrient.io/api/",
  actions: nutrientDocumentWebServicesApiActions,
};
