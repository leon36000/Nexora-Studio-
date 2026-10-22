import type { ProviderDefinition } from "../../core/types.ts";

import { circleActions } from "./actions.ts";

const service = "circle";

export const provider: ProviderDefinition = {
  service,
  displayName: "Circle",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "CIRCLE_API_TOKEN",
      description: "Circle Admin API token used with the Authorization Bearer header.",
    },
  ],
  homepageUrl: "https://circle.so",
  actions: circleActions,
};
