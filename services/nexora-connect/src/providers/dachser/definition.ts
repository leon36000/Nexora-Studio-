import type { ProviderDefinition } from "../../core/types.ts";

import { dachserActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "dachser",
  displayName: "DACHSER",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DACHSER_API_KEY",
      description:
        "DACHSER API key sent in the X-API-Key header. Create a portal login and apply for a production key at https://api-portal.dachser.com/bi.b2b.portal/api/information",
    },
  ],
  homepageUrl: "https://www.dachser.com/",
  actions: dachserActions,
};
