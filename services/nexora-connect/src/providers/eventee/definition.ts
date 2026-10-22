import type { ProviderDefinition } from "../../core/types.ts";

import { eventeeActions } from "./actions.ts";

const service = "eventee";

export const provider: ProviderDefinition = {
  service,
  displayName: "Eventee",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "eventee_api_token",
      description:
        "Eventee API token used with the Authorization Bearer header. Generate it in Eventee Admin under Settings > Features > Public API.",
    },
  ],
  homepageUrl: "https://eventee.co",
  actions: eventeeActions,
};
