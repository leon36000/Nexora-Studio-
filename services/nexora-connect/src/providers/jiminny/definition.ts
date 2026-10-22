import type { ProviderDefinition } from "../../core/types.ts";

import { jiminnyActions } from "./actions.ts";

const service = "jiminny";

export const provider: ProviderDefinition = {
  service,
  displayName: "Jiminny",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "JIMINNY_API_KEY",
      description:
        "Jiminny API key sent as a Bearer token. Admins and owners can generate it in Jiminny under Organisation Settings > General > API Key: https://help.jiminny.com/en/articles/9527212-what-is-the-jiminny-api",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "us",
          description:
            "Jiminny API region for your account. Use us for https://app.jiminny.com or eu for https://app.jiminny.eu.",
        },
      ],
    },
  ],
  homepageUrl: "https://jiminny.com",
  actions: jiminnyActions,
};
