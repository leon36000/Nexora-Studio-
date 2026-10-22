import type { ProviderDefinition } from "../../core/types.ts";

import { fellowActions } from "./actions.ts";

const service = "fellow";

export const provider: ProviderDefinition = {
  service,
  displayName: "Fellow",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "FELLOW_API_KEY",
      description:
        "Fellow Developer API key sent with the X-API-KEY header. Generate it in User settings > Developer API after an admin enables the API: https://help.fellow.app/en/articles/11817206-api.",
      extraFields: [
        {
          key: "subdomain",
          label: "Workspace Subdomain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-workspace",
          description:
            "Fellow workspace subdomain used to build https://<subdomain>.fellow.app API requests. It is the subdomain shown in your Fellow workspace URL.",
        },
      ],
    },
  ],
  homepageUrl: "https://fellow.app",
  actions: fellowActions,
};
