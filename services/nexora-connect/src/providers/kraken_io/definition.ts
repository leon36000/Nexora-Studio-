import type { ProviderDefinition } from "../../core/types.ts";

import { krakenIoActions } from "./actions.ts";

const service = "kraken_io";

/**
 * Kraken.io provider backed by the public Kraken.io image optimization API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Kraken.io",
  categories: ["Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "kraken_api_key",
      description:
        "Kraken.io API key used inside the auth.api_key request body. Find it in your Kraken.io account API Credentials page: https://kraken.io/account/api-credentials",
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "kraken_api_secret",
          description:
            "Kraken.io API secret paired with the API key in the auth.api_secret request body. Find it in your Kraken.io account API Credentials page: https://kraken.io/account/api-credentials",
        },
      ],
    },
  ],
  homepageUrl: "https://kraken.io",
  actions: krakenIoActions,
};
