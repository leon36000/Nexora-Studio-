import type { ProviderDefinition } from "../../core/types.ts";

import { l2sActions } from "./actions.ts";

const service = "l2s";

/**
 * L2S provider backed by the public L2S URL-shortening API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "L2S",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "l2s_api_key",
      description:
        "L2S API key used with the Authorization Bearer header. Create or manage it from the L2S integrations page: https://app.l2s.is/integrations.",
    },
  ],
  homepageUrl: "https://www.l2s.is",
  actions: l2sActions,
};
