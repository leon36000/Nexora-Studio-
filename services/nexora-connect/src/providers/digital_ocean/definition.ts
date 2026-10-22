import type { ProviderDefinition } from "../../core/types.ts";

import { digitalOceanActions } from "./actions.ts";

const service = "digital_ocean";

export const provider: ProviderDefinition = {
  service,
  displayName: "DigitalOcean",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "dop_v1_...",
      description:
        "DigitalOcean personal access token used with the Authorization Bearer header. Create one from the DigitalOcean API Tokens page.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.digitalocean.com",
  actions: digitalOceanActions,
};
