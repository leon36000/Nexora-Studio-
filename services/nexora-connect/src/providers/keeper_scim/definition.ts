import type { ProviderDefinition } from "../../core/types.ts";

import { keeperScimActions } from "./actions.ts";

const service = "keeper_scim";

export const provider: ProviderDefinition = {
  service,
  displayName: "Keeper SCIM",
  categories: ["Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "SCIM Bearer Token",
      placeholder: "KEEPER_SCIM_BEARER_TOKEN",
      description:
        "Keeper SCIM bearer token sent in the Authorization header. Generate it on the SCIM provisioning setup page in the Keeper Admin Console: https://docs.keeper.io/enterprise-guide/user-and-team-provisioning/automated-provisioning-with-scim/using-scim-api-provisioning",
      extraFields: [
        {
          key: "nodeId",
          label: "Node ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "123",
          description:
            "Keeper enterprise node ID used in the SCIM URL. Find it on the SCIM setup page in the Keeper Admin Console, or with Keeper Commander enterprise-info --nodes.",
        },
        {
          key: "region",
          label: "Data Center",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "us",
          description:
            "Keeper data center for the tenant. Use us, eu, au, jp, ca, or gov as documented by Keeper for SCIM API provisioning.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.keepersecurity.com/",
  actions: keeperScimActions,
};
