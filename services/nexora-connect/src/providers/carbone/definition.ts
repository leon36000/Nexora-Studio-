import type { ProviderDefinition } from "../../core/types.ts";

import { carboneActions } from "./actions.ts";

const service = "carbone";

export const provider: ProviderDefinition = {
  service,
  displayName: "Carbone",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CARBONE_API_KEY",
      description:
        "Carbone API key used as an Authorization Bearer token. Copy the production or test key from your Carbone account home page.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://carbone.io",
  actions: carboneActions,
};
