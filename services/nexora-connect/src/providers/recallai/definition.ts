import type { ProviderDefinition } from "../../core/types.ts";

import { recallaiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "recallai",
  displayName: "Recall.ai",
  categories: ["Communication", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "recallai_api_key",
      description:
        "Recall.ai API key used with the Authorization Token header. Create it from your regional Recall dashboard API Keys page and use the same region where you created the key.",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "us-east-1",
          description:
            "Recall.ai region for this workspace, such as us-east-1, us-west-2, eu-central-1, or ap-northeast-1.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.recall.ai",
  actions: recallaiActions,
};
