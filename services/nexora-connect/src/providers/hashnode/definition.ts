import type { ProviderDefinition } from "../../core/types.ts";

import { hashnodeActions } from "./actions.ts";

const service = "hashnode";

export const provider: ProviderDefinition = {
  service,
  displayName: "Hashnode",
  description: "Read and manage Hashnode publications, posts, and drafts through the Hashnode GraphQL API.",
  categories: ["Developer Tools", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "hashnode_pat",
      description:
        "Hashnode Personal Access Token sent as a Bearer credential. Create or manage tokens in Hashnode Account Settings > Developer: https://hashnode.com/settings/developer",
    },
  ],
  homepageUrl: "https://hashnode.com",
  actions: hashnodeActions,
};
