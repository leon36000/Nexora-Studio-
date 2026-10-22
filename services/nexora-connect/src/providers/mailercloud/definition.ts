import type { ProviderDefinition } from "../../core/types.ts";

import { mailercloudActions } from "./actions.ts";

const service = "mailercloud";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mailercloud",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MAILERCLOUD_API_KEY",
      description:
        "Mailercloud API key sent with the Authorization request header. Generate or manage API keys from the Mailercloud dashboard under Integrations > API keys: https://support.mailercloud.com/en/articles/11452670-mcp-server-setup.",
    },
  ],
  homepageUrl: "https://www.mailercloud.com/",
  actions: mailercloudActions,
};
