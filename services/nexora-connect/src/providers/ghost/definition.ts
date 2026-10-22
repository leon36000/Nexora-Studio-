import type { ProviderDefinition } from "../../core/types.ts";

import { ghostActions } from "./actions.ts";

const service = "ghost";

/**
 * Ghost provider backed by the Ghost Content API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Ghost",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Content API Key",
      placeholder: "ghost_content_api_key",
      description:
        "Ghost Content API key used as the key query parameter. Create or view it in Ghost Admin under Settings > Advanced > Integrations: https://ghost.org/docs/content-api/.",
      extraFields: [
        {
          key: "siteUrl",
          label: "Site URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://example.ghost.io",
          description:
            "The public URL of your Ghost site. Copy it from the site URL shown in Ghost Admin or your publication settings.",
        },
      ],
    },
  ],
  homepageUrl: "https://ghost.org",
  actions: ghostActions,
};
