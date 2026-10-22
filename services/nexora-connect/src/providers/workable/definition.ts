import type { ProviderDefinition } from "../../core/types.ts";

import { workableActions } from "./actions.ts";

const service = "workable";

export const provider: ProviderDefinition = {
  service,
  displayName: "Workable",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "WORKABLE_API_TOKEN",
      description:
        "Workable API token sent with the Authorization Bearer header. Generate it in Workable from Settings > Integrations > Apps as described at https://workable.readme.io/reference/generate-an-access-token.",
      extraFields: [
        {
          key: "subdomain",
          label: "Workable Subdomain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "acme",
          description: "Your Workable account subdomain, the part before .workable.com in your Workable account URL.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.workable.com/",
  actions: workableActions,
};
