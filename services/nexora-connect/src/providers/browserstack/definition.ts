import type { ProviderDefinition } from "../../core/types.ts";

import { browserstackActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "browserstack",
  displayName: "BrowserStack",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Key",
      placeholder: "BROWSERSTACK_ACCESS_KEY",
      description:
        "BrowserStack access key used as the HTTP Basic Auth password. Copy it from BrowserStack Account > Settings > Access Keys: https://www.browserstack.com/accounts/settings.",
      extraFields: [
        {
          key: "username",
          label: "Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "BROWSERSTACK_USERNAME",
          description:
            "BrowserStack username used as the HTTP Basic Auth username. Copy it with the access key from BrowserStack Account > Settings > Access Keys: https://www.browserstack.com/accounts/settings.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.browserstack.com",
  actions: browserstackActions,
};
