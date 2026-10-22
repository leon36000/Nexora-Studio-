import type { ProviderDefinition } from "../../core/types.ts";

import { qltyActions } from "./actions.ts";

const service = "qlty";

/**
 * Qlty provider backed by the public Qlty API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Qlty",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "QLTY_API_TOKEN",
      description:
        "Qlty API token sent with the Authorization Bearer header. Generate an API token from Qlty user settings: https://qlty.sh/user/settings/tokens.",
    },
  ],
  homepageUrl: "https://qlty.sh",
  actions: qltyActions,
};
