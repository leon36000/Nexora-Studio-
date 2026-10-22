import type { ProviderDefinition } from "../../core/types.ts";

import { jumpcloudActions } from "./actions.ts";

const service = "jumpcloud";

/**
 * JumpCloud provider backed by the public JumpCloud v1 API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "JumpCloud",
  categories: ["Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "JUMPCLOUD_API_KEY",
      description:
        "JumpCloud API key sent with the x-api-key header. In the JumpCloud Admin Console, open the username menu in the top-right corner and retrieve it from API Settings: https://console.jumpcloud.com/.",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "us",
          description:
            "JumpCloud data-center region for this account. Use us for console.jumpcloud.com, eu for console.eu.jumpcloud.com, or in for console.in.jumpcloud.com.",
        },
        {
          key: "orgId",
          label: "Organization ID",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "org_...",
          description:
            "Optional JumpCloud organization ID sent with the x-org-id header for multi-tenant admin accounts.",
        },
      ],
    },
  ],
  homepageUrl: "https://jumpcloud.com/",
  actions: jumpcloudActions,
};
