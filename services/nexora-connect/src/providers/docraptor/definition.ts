import type { ProviderDefinition } from "../../core/types.ts";

import { docraptorActions } from "./actions.ts";

const service = "docraptor";

export const provider: ProviderDefinition = {
  service,
  displayName: "DocRaptor",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DOCRAPTOR_API_KEY",
      description:
        "DocRaptor API key used as the Basic auth username. Copy it from Account > API Credentials in the DocRaptor dashboard: https://docraptor.com/login",
    },
  ],
  homepageUrl: "https://docraptor.com",
  actions: docraptorActions,
};
