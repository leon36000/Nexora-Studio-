import type { ProviderDefinition } from "../../core/types.ts";

import { oomnitzaActions } from "./actions.ts";

const service = "oomnitza";

export const provider: ProviderDefinition = {
  service,
  displayName: "Oomnitza",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "OOMNITZA_API_TOKEN",
      description:
        "Oomnitza API token sent in the Authorization2 header. Create it from Configuration > Security > API tokens in your Oomnitza instance: https://oomnitza.zendesk.com/hc/en-us/articles/360049276794.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Instance Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://acme.oomnitza.com",
          description:
            "The root URL of your Oomnitza instance, such as https://acme.oomnitza.com. API tokens are specific to one Oomnitza instance.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.oomnitza.com",
  actions: oomnitzaActions,
};
