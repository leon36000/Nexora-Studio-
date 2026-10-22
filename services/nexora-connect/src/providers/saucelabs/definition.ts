import type { ProviderDefinition } from "../../core/types.ts";

import { saucelabsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "saucelabs",
  displayName: "Sauce Labs",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Key",
      placeholder: "SAUCE_ACCESS_KEY",
      description:
        "Sauce Labs access key used as the HTTP Basic password. Copy it from User Settings: https://app.saucelabs.com/user-settings",
      extraFields: [
        {
          key: "username",
          label: "Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "SAUCE_USERNAME",
          description: "Sauce Labs username used as the HTTP Basic username.",
        },
        {
          key: "dataCenter",
          label: "Data Center",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "us-west-1",
          description: "Sauce Labs data center: us-west-1, us-east-4, or eu-central-1.",
        },
      ],
    },
  ],
  homepageUrl: "https://saucelabs.com",
  actions: saucelabsActions,
};
