import type { ProviderDefinition } from "../../core/types.ts";

import { glyphicActions } from "./actions.ts";

const service = "glyphic";

export const provider: ProviderDefinition = {
  service,
  displayName: "Glyphic",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GLYPHIC_API_KEY",
      description:
        "Glyphic Airspeed API key sent with the X-API-Key request header. Create it in Airspeed API Settings at https://app.goairspeed.com/settings/api and review the official API docs at https://api.glyphic.ai/docs.",
    },
  ],
  homepageUrl: "https://www.goairspeed.com",
  actions: glyphicActions,
};
