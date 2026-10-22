import type { ProviderDefinition } from "../../core/types.ts";

import { unipileActions } from "./actions.ts";

const service = "unipile";

export const provider: ProviderDefinition = {
  service,
  displayName: "Unipile",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "UNIPILE_ACCESS_TOKEN",
      description:
        "Unipile access token sent in the X-API-KEY header. View and manage access tokens in the Unipile Dashboard: https://dashboard.unipile.com/.",
      extraFields: [
        {
          key: "dsn",
          label: "DSN",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "api1.unipile.com:12345",
          description:
            "Your Unipile API DSN host. Copy it from the Unipile Dashboard API usage panel: https://dashboard.unipile.com/.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.unipile.com/",
  actions: unipileActions,
};
