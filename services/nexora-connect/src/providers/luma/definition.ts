import type { ProviderDefinition } from "../../core/types.ts";

import { lumaActions } from "./actions.ts";

const service = "luma";

export const provider: ProviderDefinition = {
  service,
  displayName: "Luma",
  categories: ["Productivity", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "luma_api_key",
      description:
        "Luma API key sent with the x-luma-api-key header. Generate a key for a calendar from the Luma calendar API key settings at https://luma.com/calendar/manage/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://lu.ma",
  actions: lumaActions,
};
