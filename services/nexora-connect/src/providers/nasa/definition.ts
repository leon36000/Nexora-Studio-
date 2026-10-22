import type { ProviderDefinition } from "../../core/types.ts";

import { nasaActions } from "./actions.ts";

const service = "nasa";

/**
 * NASA provider backed by the public api.nasa.gov APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "NASA",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DEMO_KEY",
      description:
        "NASA API key passed as the api_key query parameter on api.nasa.gov endpoints. Generate your own key from the NASA Open APIs portal: https://api.nasa.gov/.",
    },
  ],
  homepageUrl: "https://www.nasa.gov",
  actions: nasaActions,
};
