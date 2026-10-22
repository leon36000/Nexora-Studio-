import type { ProviderDefinition } from "../../core/types.ts";

import { certSpotterActions } from "./actions.ts";

const service = "sslmate_cert_spotter_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "Cert Spotter",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sslmate_api_key",
      description:
        "SSLMate API key used with the Authorization Bearer header for Cert Spotter. Find it on your SSLMate API keys page: https://sslmate.com/account/api_keys",
      extraFields: [],
    },
  ],
  homepageUrl: "https://sslmate.com/certspotter/",
  actions: certSpotterActions,
};
