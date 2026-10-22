import type { ProviderDefinition } from "../../core/types.ts";

import { triliumActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "trilium",
  displayName: "TriliumNext Notes",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "ETAPI Token",
      placeholder: "ETAPI_TOKEN",
      description:
        "Trilium ETAPI token sent as a Bearer credential. Create one under Options > ETAPI in your Trilium instance.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Instance URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://trilium.example.com",
          description:
            "The HTTP or HTTPS URL of your Trilium instance. Private targets require OOMOL_CONNECT_ALLOW_PRIVATE_NETWORK.",
        },
      ],
    },
  ],
  homepageUrl: "https://triliumnotes.org",
  actions: triliumActions,
};
