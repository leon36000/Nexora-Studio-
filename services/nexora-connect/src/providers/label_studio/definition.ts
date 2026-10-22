import type { ProviderDefinition } from "../../core/types.ts";

import { labelStudioActions } from "./actions.ts";

const service = "label_studio";

export const provider: ProviderDefinition = {
  service,
  displayName: "Label Studio",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Legacy Token",
      placeholder: "ls_...",
      description:
        "Label Studio legacy access token sent as Authorization: Token. Find or enable access tokens from the Label Studio Account & Settings page: https://labelstud.io/guide/access_tokens.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Label Studio Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://app.humansignal.com",
          description:
            "The root URL of your Label Studio Cloud or self-hosted instance, such as https://app.humansignal.com or https://label-studio.example.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://labelstud.io",
  actions: labelStudioActions,
};
