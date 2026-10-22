import type { ProviderDefinition } from "../../core/types.ts";

import { ticketmasterActions } from "./actions.ts";

const service = "ticketmaster";

export const provider: ProviderDefinition = {
  service,
  displayName: "Ticketmaster",
  categories: ["Social", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TICKETMASTER_API_KEY",
      description:
        "Ticketmaster developer API key used as the apikey query parameter for Discovery and Partner APIs, and as the apikey header for Season Ticketing.",
    },
  ],
  homepageUrl: "https://www.ticketmaster.com",
  actions: ticketmasterActions,
};
