import type { ProviderDefinition } from "../../core/types.ts";

import { docparserActions } from "./actions.ts";

const service = "docparser";

export const provider: ProviderDefinition = {
  service,
  displayName: "Docparser",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "Docparser API key",
      description:
        "Docparser API key sent with the api_key header. Open your parser, go to More > Integrations, and copy the parser API key from the official integration settings.",
    },
  ],
  homepageUrl: "https://docparser.com",
  actions: docparserActions,
};
