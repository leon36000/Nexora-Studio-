import type { ProviderDefinition } from "../../core/types.ts";

import { boloformsActions } from "./actions.ts";

const service = "boloforms";

export const provider: ProviderDefinition = {
  service,
  displayName: "BoloForms",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "boloforms_api_key",
      description:
        "BoloForms API key sent with the x-api-key header. Generate or copy it from the BoloForms API Key settings page: https://signature.boloforms.com/settings?copyKey=true&subType=APIKEY&type=DEV_SEC",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.boloforms.com",
  actions: boloformsActions,
};
