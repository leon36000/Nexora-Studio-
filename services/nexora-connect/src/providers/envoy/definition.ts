import type { ProviderDefinition } from "../../core/types.ts";

import { envoyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "envoy",
  displayName: "Envoy",
  categories: ["Productivity", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Client API Key",
      placeholder: "ENVOY_CLIENT_API_KEY",
      description:
        "Envoy Client API Key sent in the X-API-Key header for private apps. Create a private app and generate a Client API Key in the Envoy dashboard: https://developers.envoy.com/hub/docs/client-api-keys.",
    },
  ],
  homepageUrl: "https://envoy.com",
  actions: envoyActions,
};
