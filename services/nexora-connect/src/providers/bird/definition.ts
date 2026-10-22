import type { ProviderDefinition } from "../../core/types.ts";

import { birdActions } from "./actions.ts";

const service = "bird";

export const provider: ProviderDefinition = {
  service,
  displayName: "Bird",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Key",
      placeholder: "BIRD_ACCESS_KEY",
      description:
        "Bird access key used in the Authorization header for API requests. Create and manage access keys in Bird security settings: https://app.bird.com/settings/security/access-keys",
    },
  ],
  homepageUrl: "https://bird.com",
  actions: birdActions,
};
