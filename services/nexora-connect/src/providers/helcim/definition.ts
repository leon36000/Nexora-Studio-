import type { ProviderDefinition } from "../../core/types.ts";

import { helcimActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "helcim",
  displayName: "Helcim",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "YOUR_HELCIM_API_TOKEN",
      description:
        "Helcim API token sent in the api-token header. Create one under All Tools > Integrations > API Access Configurations: https://devdocs.helcim.com/docs/authentication-with-the-helcim-api-and-helcimpayjs",
    },
  ],
  homepageUrl: "https://www.helcim.com/",
  actions: helcimActions,
};
