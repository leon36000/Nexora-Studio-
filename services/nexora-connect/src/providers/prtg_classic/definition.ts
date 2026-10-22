import type { ProviderDefinition } from "../../core/types.ts";

import { prtgClassicActions } from "./actions.ts";

const service = "prtg_classic";
const prtgClassicCredentialHelpUrl = "https://www.paessler.com/manuals/prtg/api_keys";

export const provider: ProviderDefinition = {
  service,
  displayName: "PRTG Classic",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "prtg_api_key",
      description: `PRTG API key sent as the apitoken query parameter. Create or view API keys from Account Settings > API Keys in PRTG: ${prtgClassicCredentialHelpUrl}`,
      extraFields: [
        {
          key: "instanceUrl",
          label: "Instance URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://prtg.example.com",
          description: "Your public HTTPS PRTG instance URL. URLs ending in /api are also accepted.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.paessler.com/prtg",
  actions: prtgClassicActions,
};
