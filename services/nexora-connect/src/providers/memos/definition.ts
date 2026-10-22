import type { ProviderDefinition } from "../../core/types.ts";

import { memosActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "memos",
  displayName: "Memos",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "memos_pat_...",
      description: "Memos personal access token sent as a Bearer credential. Create one in account settings.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Instance URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://memos.example.com",
          description:
            "The HTTP or HTTPS URL of your Memos instance. Private targets require OOMOL_CONNECT_ALLOW_PRIVATE_NETWORK.",
        },
      ],
    },
  ],
  homepageUrl: "https://usememos.com",
  actions: memosActions,
};
