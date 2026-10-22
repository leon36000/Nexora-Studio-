import type { ProviderDefinition } from "../../core/types.ts";

import { skioActions } from "./actions.ts";

const service = "skio";

export const provider: ProviderDefinition = {
  service,
  displayName: "Skio",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SKIO_API_KEY",
      description:
        "Skio API key sent with the Authorization header as API <key>. Generate it in the Skio dashboard under API & Integrations > API.",
    },
  ],
  homepageUrl: "https://skio.com",
  actions: skioActions,
};
