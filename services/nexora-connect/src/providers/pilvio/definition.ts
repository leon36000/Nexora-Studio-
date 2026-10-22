import type { ProviderDefinition } from "../../core/types.ts";

import { pilvioActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "pilvio",
  displayName: "Pilvio",
  categories: ["Developer Tools", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "PILVIO_API_TOKEN",
      description:
        "Pilvio API token sent in the apikey header. Register or manage API tokens at https://app.pilvio.com/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://pilvio.com/",
  actions: pilvioActions,
};
