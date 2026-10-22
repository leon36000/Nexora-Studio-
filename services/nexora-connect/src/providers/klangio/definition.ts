import type { ProviderDefinition } from "../../core/types.ts";

import { klangioActions } from "./actions.ts";

const service = "klangio";

/**
 * Klangio provider backed by the public Klangio API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Klangio",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KLANGIO_API_KEY",
      description:
        "Klangio API key sent with the kl-api-key header. Apply for API access on the official Klangio API page: https://klang.io/api/ .",
    },
  ],
  homepageUrl: "https://klang.io",
  actions: klangioActions,
};
