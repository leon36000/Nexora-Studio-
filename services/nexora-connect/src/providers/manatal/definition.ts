import type { ProviderDefinition } from "../../core/types.ts";

import { manatalActions } from "./actions.ts";

const service = "manatal";

export const provider: ProviderDefinition = {
  service,
  displayName: "Manatal",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MANATAL_API_KEY",
      description:
        "Manatal API token used with the Authorization: Token <apiKey> header. Manatal says Open API tokens are obtained from its support team: https://developers.manatal.com/reference/getting-started.",
    },
  ],
  homepageUrl: "https://www.manatal.com/",
  actions: manatalActions,
};
