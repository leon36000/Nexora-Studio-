import type { ProviderDefinition } from "../../core/types.ts";

import { sevdeskActions } from "./actions.ts";

const service = "sevdesk";

export const provider: ProviderDefinition = {
  service,
  displayName: "sevdesk",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "32-character hex token",
      description:
        "sevdesk API token sent as the Authorization header value. Get it from the Authentication and Authorization section of the official sevdesk API docs: https://api.sevdesk.de/#section/Authentication-and-Authorization",
    },
  ],
  homepageUrl: "https://sevdesk.com",
  actions: sevdeskActions,
};
