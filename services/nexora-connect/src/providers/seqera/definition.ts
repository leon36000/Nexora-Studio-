import type { ProviderDefinition } from "../../core/types.ts";

import { seqeraActions } from "./actions.ts";

const service = "seqera";

export const provider: ProviderDefinition = {
  service,
  displayName: "Seqera",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "seqera_access_token",
      description:
        "Seqera API access token sent with the Authorization Bearer header. Create it from User tokens in Seqera Platform as described at https://docs.seqera.io/platform-cli/installation.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          placeholder: "https://api.cloud.seqera.io",
          description:
            "The Seqera Platform API base URL used to validate the token and execute actions. Use https://api.cloud.seqera.io for Seqera Cloud, or your self-hosted API endpoint if you run Seqera Platform outside Seqera Cloud.",
          required: false,
          secret: false,
        },
      ],
    },
  ],
  homepageUrl: "https://seqera.io",
  actions: seqeraActions,
};
