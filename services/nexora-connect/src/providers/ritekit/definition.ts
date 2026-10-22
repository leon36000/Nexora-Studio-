import type { ProviderDefinition } from "../../core/types.ts";

import { ritekitActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "ritekit",
  displayName: "RiteKit",
  description: "Analyze, generate, enhance, and clean social media hashtags with RiteKit.",
  categories: ["Social", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Client ID",
      placeholder: "RITEKIT_CLIENT_ID",
      description:
        "RiteKit Client ID sent as the client_id query parameter. Create or view it in the official RiteKit API Console: https://ritekit.com/developer/dashboard/",
    },
  ],
  homepageUrl: "https://ritekit.com/",
  actions: ritekitActions,
};
