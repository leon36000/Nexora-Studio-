import type { ProviderDefinition } from "../../core/types.ts";

import { raygunActions } from "./actions.ts";

const service = "raygun";

export const provider: ProviderDefinition = {
  service,
  displayName: "Raygun",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "RAYGUN_PAT",
      description:
        "Raygun personal access token used as a Bearer token. Create it in Raygun under My settings > Personal Access Tokens.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://raygun.com",
  actions: raygunActions,
};
