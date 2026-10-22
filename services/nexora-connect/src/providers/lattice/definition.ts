import type { ProviderDefinition } from "../../core/types.ts";

import { latticeActions } from "./actions.ts";

const service = "lattice";

export const provider: ProviderDefinition = {
  service,
  displayName: "Lattice",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "lattice_api_key",
      description:
        "Lattice API key sent as a Bearer token. View and manage API keys in the Lattice admin dashboard: https://developers.lattice.com/docs/authentication-1.",
      extraFields: [
        {
          key: "dataResidency",
          label: "Data Residency",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "us",
          description:
            "The Lattice data residency region used to select the API base URL. Enter us for https://api.latticehq.com or emea for https://api.emea.latticehq.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://lattice.com",
  actions: latticeActions,
};
