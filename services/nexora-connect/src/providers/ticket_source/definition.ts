import type { ProviderDefinition } from "../../core/types.ts";

import { ticketSourceActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "ticket_source",
  displayName: "TicketSource",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "skl-xxxxxxxxxx",
      description:
        "TicketSource API key sent as a Bearer token. Copy it from Settings > API in your TicketSource account.",
    },
  ],
  homepageUrl: "https://www.ticketsource.co.uk/",
  actions: ticketSourceActions,
};
