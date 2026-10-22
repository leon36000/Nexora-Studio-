import type { ProviderDefinition } from "../../core/types.ts";

import { metronomeActions } from "./actions.ts";

const service = "metronome";

export const provider: ProviderDefinition = {
  service,
  displayName: "Metronome",
  categories: ["Finance", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "METRONOME_BEARER_TOKEN",
      description:
        "Metronome API token sent with the Authorization: Bearer header. Create one in Metronome under Connections > API tokens & webhooks: https://docs.metronome.com/api-reference/authentication.",
    },
  ],
  homepageUrl: "https://metronome.com",
  actions: metronomeActions,
};
