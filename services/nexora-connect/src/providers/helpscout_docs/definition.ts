import type { ProviderDefinition } from "../../core/types.ts";

import { helpscoutDocsActions } from "./actions.ts";

const service = "helpscout_docs";

/**
 * Help Scout Docs provider backed by the Help Scout Docs API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Help Scout Docs",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Docs API Key",
      placeholder: "HELPSCOUT_DOCS_API_KEY",
      description:
        "Help Scout Docs API key used with HTTP Basic Authentication. In Help Scout Docs, open Authentication and then the API Keys tab.",
    },
  ],
  homepageUrl: "https://www.helpscout.com",
  actions: helpscoutDocsActions,
};
