import type { ProviderDefinition } from "../../core/types.ts";

import { taniumActions } from "./actions.ts";

const service = "tanium";

export const provider: ProviderDefinition = {
  service,
  displayName: "Tanium",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "token-...",
      description:
        "Tanium API token sent in the session header. Create API tokens in Administration > Permissions > API Tokens, or see https://help.tanium.com/bundle/ug_console_cloud/page/platform_user/console_api_tokens.html.",
      extraFields: [
        {
          key: "gatewayUrl",
          label: "Gateway GraphQL URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://example.taniumcloud.com/plugin/products/gateway/graphql",
          description:
            "The full Tanium Gateway GraphQL endpoint URL for your Tanium instance, such as https://example.taniumcloud.com/plugin/products/gateway/graphql.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.tanium.com",
  actions: taniumActions,
};
