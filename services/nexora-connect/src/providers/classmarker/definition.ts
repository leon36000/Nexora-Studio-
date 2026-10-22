import type { ProviderDefinition } from "../../core/types.ts";

import { classmarkerActions } from "./actions.ts";

const service = "classmarker";

export const provider: ProviderDefinition = {
  service,
  displayName: "ClassMarker",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CLASSMARKER_API_KEY",
      description:
        "ClassMarker API key used together with your API secret to generate a lowercase SHA256 request signature. Create both values in your ClassMarker account under API access: https://www.classmarker.com/online-testing/api/developers/",
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CLASSMARKER_API_SECRET",
          description:
            "ClassMarker API secret paired with your API key for SHA256 request signing. Copy it when you create the API key in your ClassMarker account under API access: https://www.classmarker.com/online-testing/api/developers/",
        },
      ],
    },
  ],
  homepageUrl: "https://www.classmarker.com",
  actions: classmarkerActions,
};
