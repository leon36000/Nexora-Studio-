import type { ProviderDefinition } from "../../core/types.ts";

import { taxjarActions } from "./actions.ts";

const service = "taxjar";

export const provider: ProviderDefinition = {
  service,
  displayName: "TaxJar",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TAXJAR_API_KEY",
      description: "TaxJar API token sent as a Bearer token. Get it from TaxJar under Account > TaxJar API.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.taxjar.com/",
  actions: taxjarActions,
};
