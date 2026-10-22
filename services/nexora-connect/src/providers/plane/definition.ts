import type { ProviderDefinition } from "../../core/types.ts";

import { planeActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "plane",
  displayName: "Plane",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "plane_api_...",
      description:
        "Plane personal access token sent with the X-API-Key header. Create it from Plane Profile Settings under Personal Access Tokens: https://developers.plane.so/api-reference/introduction.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://api.plane.so",
          description:
            "Optional Plane API base URL. Leave empty for Plane Cloud, or enter your self-hosted Plane API origin.",
        },
      ],
    },
  ],
  homepageUrl: "https://plane.so",
  actions: planeActions,
};
