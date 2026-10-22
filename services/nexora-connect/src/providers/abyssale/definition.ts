import type { ProviderDefinition } from "../../core/types.ts";

import { abyssaleActions } from "./actions.ts";

const service = "abyssale";

export const provider: ProviderDefinition = {
  service,
  displayName: "Abyssale",
  categories: ["Design", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ABYSSALE_API_KEY",
      description:
        "Abyssale API key sent with the x-api-key header. Create or copy it from the API page in your Abyssale account: https://app.abyssale.com/api-key.",
    },
  ],
  homepageUrl: "https://www.abyssale.com/",
  actions: abyssaleActions,
};
