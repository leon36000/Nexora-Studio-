import type { ProviderDefinition } from "../../core/types.ts";

import { calendarificActions } from "./actions.ts";

const service = "calendarific";

export const provider: ProviderDefinition = {
  service,
  displayName: "Calendarific",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CALENDARIFIC_API_KEY",
      description:
        "Calendarific API key passed as the api_key query parameter. Get it from your Calendarific account pages: https://calendarific.com/api-documentation",
      extraFields: [],
    },
  ],
  homepageUrl: "https://calendarific.com/",
  actions: calendarificActions,
};
