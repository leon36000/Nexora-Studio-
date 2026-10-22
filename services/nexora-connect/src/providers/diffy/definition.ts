import type { ProviderDefinition } from "../../core/types.ts";

import { diffyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "diffy",
  displayName: "Diffy",
  description: "Read Diffy visual testing projects, screenshots, and comparison results.",
  categories: ["Developer Tools", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DIFFY_API_KEY",
      description:
        "Diffy API key exchanged for an API bearer token. Generate a key from https://app.diffy.website/#/keys.",
    },
  ],
  homepageUrl: "https://diffy.website/",
  actions: diffyActions,
};
