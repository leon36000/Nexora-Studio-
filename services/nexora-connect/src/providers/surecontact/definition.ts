import type { ProviderDefinition } from "../../core/types.ts";

import { surecontactActions } from "./actions.ts";

const service = "surecontact";

export const provider: ProviderDefinition = {
  service,
  displayName: "SureContact",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SURECONTACT_API_KEY",
      description:
        "SureContact API key sent with the X-API-Key header. Create or view it from the SureContact API settings area documented at https://api.surecontact.com/docs.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://surecontact.com/",
  actions: surecontactActions,
};
