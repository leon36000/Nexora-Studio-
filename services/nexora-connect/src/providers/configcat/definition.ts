import type { ProviderDefinition } from "../../core/types.ts";

import { configcatActions } from "./actions.ts";

const service = "configcat";

export const provider: ProviderDefinition = {
  service,
  displayName: "ConfigCat",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Public API Username",
      placeholder: "CONFIGCAT_PUBLIC_API_USERNAME",
      description:
        "ConfigCat Public API username used for HTTP Basic Authentication. Create or view Public API credentials in your ConfigCat account: https://app.configcat.com/my-account/public-api-credentials.",
      extraFields: [
        {
          key: "password",
          label: "Public API Password",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CONFIGCAT_PUBLIC_API_PASSWORD",
          description:
            "ConfigCat Public API password paired with the username for HTTP Basic Authentication. Create or view Public API credentials in your ConfigCat account: https://app.configcat.com/my-account/public-api-credentials.",
        },
      ],
    },
  ],
  homepageUrl: "https://configcat.com/",
  actions: configcatActions,
};
