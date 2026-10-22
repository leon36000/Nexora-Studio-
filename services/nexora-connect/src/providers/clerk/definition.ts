import type { ProviderDefinition } from "../../core/types.ts";

import { clerkActions } from "./actions.ts";

const service = "clerk";

export const provider: ProviderDefinition = {
  service,
  displayName: "Clerk",
  categories: ["Security", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret Key",
      placeholder: "sk_test_...",
      description:
        "Clerk secret key used with the Authorization Bearer header. Create or reveal it in the Clerk Dashboard API keys page: https://dashboard.clerk.com/last-active?path=api-keys",
      extraFields: [],
    },
  ],
  homepageUrl: "https://clerk.com",
  actions: clerkActions,
};
