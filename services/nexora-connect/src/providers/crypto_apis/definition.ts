import type { ProviderDefinition } from "../../core/types.ts";

import { cryptoApisActions } from "./actions.ts";

const service = "crypto_apis";

export const provider: ProviderDefinition = {
  service,
  displayName: "Crypto APIs",
  description: "Query supported assets, asset details, and exchange rates from Crypto APIs market data.",
  categories: ["Finance", "Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CRYPTO_APIS_API_KEY",
      description:
        "Crypto APIs API key sent with the x-api-key header. Create and manage API keys in the Crypto APIs dashboard at https://app.cryptoapis.io/login.",
    },
  ],
  homepageUrl: "https://cryptoapis.io",
  actions: cryptoApisActions,
};
