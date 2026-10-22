import type { ProviderDefinition } from "../../core/types.ts";

import { theDogApiActions } from "./actions.ts";

const service = "the_dog_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "The Dog API",
  categories: ["Design & Media", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "THE_DOG_API_KEY",
      description: "The Dog API key sent with the x-api-key header.",
    },
  ],
  homepageUrl: "https://thedogapi.com/",
  actions: theDogApiActions,
};
