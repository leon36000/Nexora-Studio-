import type { ProviderDefinition } from "../../core/types.ts";

import { stannpActions } from "./actions.ts";

const service = "stannp";

export const provider: ProviderDefinition = {
  service,
  displayName: "Stannp",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "STANNP_API_KEY",
      description:
        "Stannp API key used as the Basic Auth username with an empty password. Find it at the bottom of your Stannp account settings page: https://www.stannp.com/us/direct-mail-api/guide.",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "eu",
          description: "Stannp API region for this account. Use eu for EU/UK accounts or us for US/CA accounts.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.stannp.com",
  actions: stannpActions,
};
