import type { ProviderDefinition } from "../../core/types.ts";

import { ecologiActions } from "./actions.ts";

const service = "ecologi";
const ecologiCredentialHelpUrl = "https://ecologi.com/impact-api";

export const provider: ProviderDefinition = {
  service,
  displayName: "Ecologi",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ECOLOGI_API_KEY",
      description: `Ecologi API key sent as a Bearer token. Find your key on the official Impact API page: ${ecologiCredentialHelpUrl}.`,
    },
  ],
  homepageUrl: "https://ecologi.com",
  actions: ecologiActions,
};
