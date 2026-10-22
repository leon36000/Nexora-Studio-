import type { ProviderDefinition } from "../../core/types.ts";

import { profileapiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "profileapi",
  displayName: "profileAPI",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PROFILEAPI_API_KEY",
      description:
        "profileAPI key sent as Authorization: ApiKey <key>. Request a key through the official Start Building form.",
    },
  ],
  homepageUrl: "https://profileapi.com",
  actions: profileapiActions,
};
