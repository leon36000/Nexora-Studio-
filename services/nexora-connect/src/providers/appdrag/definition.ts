import type { ProviderDefinition } from "../../core/types.ts";

import { appdragActions } from "./actions.ts";

const service = "appdrag";

export const provider: ProviderDefinition = {
  service,
  displayName: "AppDrag",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "APPDRAG_API_KEY",
      description:
        'AppDrag project API key forwarded as the APIKey request parameter. Open the official AppDrag dashboard, then use the "API" or "Databases" dashboard to copy or regenerate the shared project API key described here: https://support.appdrag.com/doc/Authentication-and-Access-Control.',
      extraFields: [],
    },
  ],
  homepageUrl: "https://appdrag.com",
  actions: appdragActions,
};
