import type { ProviderDefinition } from "../../core/types.ts";

import { controlDActions } from "./actions.ts";

const service = "control_d";

export const provider: ProviderDefinition = {
  service,
  displayName: "Control D",
  categories: ["Security", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "ctrld_api_token",
      description:
        "Control D API token used with the Authorization Bearer header. Create and manage it from the Control D dashboard API page: https://docs.controld.com/docs/org-api",
    },
  ],
  homepageUrl: "https://controld.com",
  actions: controlDActions,
};
