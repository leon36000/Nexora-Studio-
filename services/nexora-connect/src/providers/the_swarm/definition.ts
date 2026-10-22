import type { ProviderDefinition } from "../../core/types.ts";

import { theSwarmActions } from "./actions.ts";

const service = "the_swarm";

export const provider: ProviderDefinition = {
  service,
  displayName: "The Swarm",
  categories: ["Data", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "THE_SWARM_API_KEY",
      description: "The Swarm API key sent with the x-api-key header. Generate it from the Team Settings API page.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.theswarm.com",
  actions: theSwarmActions,
};
