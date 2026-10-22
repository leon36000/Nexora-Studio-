import type { ProviderDefinition } from "../../core/types.ts";

import { hexActions } from "./actions.ts";

const service = "hex";

/**
 * Hex provider backed by the Hex REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Hex",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "hxtp_... or hxtw_...",
      description:
        "Hex personal access token or workspace token used with the Authorization Bearer header. Create it from User settings > Account > API keys.",
    },
  ],
  homepageUrl: "https://hex.tech",
  actions: hexActions,
};
