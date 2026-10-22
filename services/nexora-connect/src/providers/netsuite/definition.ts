import type { ProviderDefinition } from "../../core/types.ts";

import { netsuiteActions } from "./actions.ts";

const service = "netsuite";

export const provider: ProviderDefinition = {
  service,
  displayName: "NetSuite",
  categories: ["Finance", "Productivity"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "accountId",
          label: "Account ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "1234567_SB1",
          description:
            "NetSuite account ID used to build the SuiteTalk REST domain. Find it in NetSuite under Setup > Company > Company Information.",
        },
        {
          key: "consumerKey",
          label: "Consumer Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "netsuite_consumer_key",
          description: "Integration record consumer key used for NetSuite token-based authentication.",
        },
        {
          key: "consumerSecret",
          label: "Consumer Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "netsuite_consumer_secret",
          description: "Integration record consumer secret used to sign NetSuite OAuth 1.0 requests.",
        },
        {
          key: "tokenId",
          label: "Token ID",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "netsuite_token_id",
          description: "Token ID for a NetSuite access token created for the integration and user role.",
        },
        {
          key: "tokenSecret",
          label: "Token Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "netsuite_token_secret",
          description: "Token secret paired with the NetSuite Token ID for token-based authentication.",
        },
      ],
      testAction: {
        actionName: "list_records",
        input: {
          recordType: "customer",
          limit: 1,
        },
      },
    },
  ],
  homepageUrl: "https://www.netsuite.com",
  actions: netsuiteActions,
};
