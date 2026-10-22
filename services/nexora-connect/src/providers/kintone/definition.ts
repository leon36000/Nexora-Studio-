import type { ProviderDefinition } from "../../core/types.ts";

import { kintoneActions } from "./actions.ts";

const service = "kintone";

export const provider: ProviderDefinition = {
  service,
  displayName: "Kintone",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "User API Token",
      placeholder: "cy.s.api1...",
      description:
        "Kintone User API token sent with the Authorization: Bearer header. Generate it in Kintone System Administration settings: https://kintone.dev/en/docs/common/user-api/overview/user-api-overview/#api-token-authentication.",
      extraFields: [
        {
          key: "subdomain",
          label: "Subdomain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "example",
          description:
            "Your Kintone subdomain from https://{subdomain}.kintone.com. Enter only the subdomain value, such as example.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.kintone.com/",
  actions: kintoneActions,
};
