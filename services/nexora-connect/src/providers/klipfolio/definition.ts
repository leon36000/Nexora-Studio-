import type { ProviderDefinition } from "../../core/types.ts";

import { klipfolioActions } from "./actions.ts";

const service = "klipfolio";

export const provider: ProviderDefinition = {
  service,
  displayName: "Klipfolio",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KLIPFOLIO_API_KEY",
      description:
        "Klipfolio API key sent with the kf-api-key header. Generate or copy an API key from your Klipfolio My Profile page: https://support.klipfolio.com/hc/en-us/articles/215546648-Managing-API-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.klipfolio.com",
  actions: klipfolioActions,
};
