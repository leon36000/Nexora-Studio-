import type { ProviderDefinition } from "../../core/types.ts";

import { keygenActions } from "./actions.ts";

const service = "keygen";

/**
 * Keygen provider backed by the public Keygen JSON:API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Keygen",
  categories: ["Developer Tools", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "keygen_api_token",
      description:
        "Keygen API token sent with the Authorization Bearer header. Generate an environment or product token from the Keygen dashboard or token API: https://keygen.sh/docs/api/authentication/",
      extraFields: [
        {
          key: "account",
          label: "Account ID or Slug",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "demo",
          description:
            "The Keygen account UUID or slug used in /v1/accounts/<account>. Find it in Account Settings under Current Account: https://keygen.sh/docs/api/#your-keygen-account",
        },
      ],
    },
  ],
  homepageUrl: "https://keygen.sh",
  actions: keygenActions,
};
