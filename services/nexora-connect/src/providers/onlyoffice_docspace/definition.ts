import type { ProviderDefinition } from "../../core/types.ts";

import { onlyofficeDocspaceActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "onlyoffice_docspace",
  displayName: "ONLYOFFICE DocSpace",
  categories: ["Productivity", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ONLYOFFICE_API_KEY",
      description: "Create an API key in DocSpace under Settings > Developer Tools > API keys.",
      extraFields: [
        {
          key: "portalUrl",
          label: "Portal URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://yourportal.onlyoffice.com",
          description:
            "The HTTPS root URL of your ONLYOFFICE DocSpace portal. Private-network portals require OOMOL_CONNECT_ALLOW_PRIVATE_NETWORK in self-hosted deployments.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.onlyoffice.com/docspace.aspx",
  actions: onlyofficeDocspaceActions,
};
