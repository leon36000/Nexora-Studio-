import type { ProviderDefinition } from "../../core/types.ts";

import { quickbaseActions } from "./actions.ts";

const service = "quickbase";

export const provider: ProviderDefinition = {
  service,
  displayName: "Quickbase",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "User Token",
      placeholder: "QB_USER_TOKEN",
      description:
        "Quickbase user token sent as QB-USER-TOKEN authorization. Create or copy a user token from Quickbase My preferences: https://help.quickbase.com/docs/create-and-use-user-tokens.",
      extraFields: [
        {
          key: "realmHostname",
          label: "Realm Hostname",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "example.quickbase.com",
          description:
            "Your Quickbase realm hostname used in the QB-Realm-Hostname header, such as example.quickbase.com or example.quickbase.eu.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.quickbase.com",
  actions: quickbaseActions,
};
