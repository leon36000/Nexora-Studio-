import type { ProviderDefinition } from "../../core/types.ts";

import { gotifyActions } from "./actions.ts";

const service = "gotify";

export const provider: ProviderDefinition = {
  service,
  displayName: "Gotify",
  description: "Send messages and inspect health and version information for a Gotify server.",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Application Token",
      placeholder: "GOTIFY_APPLICATION_TOKEN",
      description:
        "Gotify application token sent with the X-Gotify-Key header. In the Gotify WebUI, open Apps, create or select an application, and copy its token: https://gotify.net/docs/pushmsg.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Server Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://push.example.com",
          description:
            "The HTTP or HTTPS URL of your Gotify server. Public addresses work by default; private-network instances require the self-hosted runtime to enable OOMOL_CONNECT_ALLOW_PRIVATE_NETWORK. Unsafe local, reserved, and cloud-metadata targets remain blocked.",
        },
      ],
    },
  ],
  homepageUrl: "https://gotify.net",
  actions: gotifyActions,
};
