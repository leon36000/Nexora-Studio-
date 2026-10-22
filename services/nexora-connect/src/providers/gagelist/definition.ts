import type { ProviderDefinition } from "../../core/types.ts";

import { gagelistActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "gagelist",
  displayName: "GageList",
  categories: ["Productivity"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "clientId",
          label: "Client ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "GAGELIST_CLIENT_ID",
          description:
            "The GageList API client ID used to exchange an access token. Obtain API credentials from your GageList account or support team through the developer resources: https://gagelist.com/developer-resources/authenticate-with-gagelist/.",
        },
        {
          key: "clientSecret",
          label: "Client Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "GAGELIST_CLIENT_SECRET",
          description:
            "The GageList API client secret paired with the client ID. Obtain API credentials from your GageList account or support team through the developer resources: https://gagelist.com/developer-resources/authenticate-with-gagelist/.",
        },
      ],
    },
  ],
  homepageUrl: "https://gagelist.com/",
  actions: gagelistActions,
};
