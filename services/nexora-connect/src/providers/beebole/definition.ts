import type { ProviderDefinition } from "../../core/types.ts";

import { beeboleActions } from "./actions.ts";

const service = "beebole";

export const provider: ProviderDefinition = {
  service,
  displayName: "Beebole",
  description: "Run GraphQL queries and mutations against a Beebole time-tracking account.",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BEEBOLE_API_KEY",
      description:
        "Beebole API key sent with the apikey header. In Beebole, open the initials button at the bottom of the left sidebar, then open API Key to copy or reset it: https://beebole.com/help/api/introduction.",
    },
  ],
  homepageUrl: "https://beebole.com",
  actions: beeboleActions,
};
