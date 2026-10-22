import type { ProviderDefinition } from "../../core/types.ts";

import { guruActions } from "./actions.ts";

const service = "guru";

/**
 * Guru knowledge base provider backed by Guru's Basic Auth API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Guru",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "GURU_API_TOKEN",
      description:
        "Guru API token used as the Basic Auth password. Create or view API tokens from Guru's API settings: https://developer.getguru.com/reference/authentication",
      extraFields: [
        {
          key: "username",
          label: "Username or Collection ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "admin@example.com",
          description:
            "Guru Basic Auth username. Use your Guru user identifier with a user token, or the collection ID with a collection token: https://developer.getguru.com/reference/authentication",
        },
      ],
    },
  ],
  homepageUrl: "https://www.getguru.com",
  actions: guruActions,
};
