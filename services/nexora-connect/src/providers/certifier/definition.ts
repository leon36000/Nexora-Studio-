import type { ProviderDefinition } from "../../core/types.ts";

import { certifierActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "certifier",
  displayName: "Certifier",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "cert_...",
      description:
        "Certifier access token used with the Authorization Bearer header. Create and manage it from the Certifier Dashboard: https://developers.certifier.io/reference/authentication",
    },
  ],
  homepageUrl: "https://certifier.io",
  actions: certifierActions,
};
