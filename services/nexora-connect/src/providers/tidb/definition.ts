import type { ProviderDefinition } from "../../core/types.ts";

import { tidbActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "tidb",
  displayName: "TiDB Cloud",
  categories: ["Data", "Developer Tools"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "publicKey",
          label: "Public Key",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "Your TiDB Cloud API public key",
          description:
            "TiDB Cloud API public key used as the HTTP Digest username. Create or view organization API keys in TiDB Cloud API Keys: https://tidbcloud.com/org-settings/api-keys.",
        },
        {
          key: "privateKey",
          label: "Private Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "Your TiDB Cloud API private key",
          description:
            "TiDB Cloud API private key used as the HTTP Digest password. TiDB Cloud only shows the private key when you create the API key.",
        },
      ],
      testAction: {
        actionName: "list_api_keys",
        input: { pageSize: 1 },
      },
    },
  ],
  homepageUrl: "https://www.pingcap.com/tidb/cloud/",
  actions: tidbActions,
};
