import type { ProviderDefinition } from "../../core/types.ts";

import { squareActions } from "./actions.ts";

const service = "square";

export const provider: ProviderDefinition = {
  service,
  displayName: "Square",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "EAAA...",
      description:
        "Square access token used with the Authorization: Bearer header. Create or view a personal access token in the Square Developer Console credentials page.",
    },
  ],
  homepageUrl: "https://squareup.com",
  actions: squareActions,
};
