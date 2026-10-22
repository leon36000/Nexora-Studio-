import type { ProviderDefinition } from "../../core/types.ts";

import { meetGeekActions } from "./actions.ts";

const service = "meet_geek";

/**
 * MeetGeek provider backed by the public MeetGeek REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "MeetGeek",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MEETGEEK_API_KEY",
      description:
        "MeetGeek API key sent as a Bearer token. Sign in at https://app.meetgeek.ai/integrations and generate a key from the Public API card.",
    },
  ],
  homepageUrl: "https://meetgeek.ai",
  actions: meetGeekActions,
};
