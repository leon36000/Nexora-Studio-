import type { ProviderDefinition } from "../../core/types.ts";

import { contentfulActions } from "./actions.ts";

const service = "contentful";

export const provider: ProviderDefinition = {
  service,
  displayName: "Contentful",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "CFPAT-...",
      description:
        "Contentful personal access token used with the Authorization Bearer header. Get it from Settings > CMA tokens in the Contentful web app: https://app.contentful.com/account/profile/cma_tokens.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.contentful.com",
  actions: contentfulActions,
};
