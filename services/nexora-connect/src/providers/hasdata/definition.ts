import type { ProviderDefinition } from "../../core/types.ts";

import { hasdataActions } from "./actions.ts";

const service = "hasdata";

export const provider: ProviderDefinition = {
  service,
  displayName: "HasData",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HASDATA_API_KEY",
      description:
        "HasData API key sent with the x-api-key header. Sign in at https://app.hasdata.com/sign-in, open account settings, and copy your API key.",
    },
  ],
  homepageUrl: "https://hasdata.com",
  actions: hasdataActions,
};
