import type { ProviderDefinition } from "../../core/types.ts";

import { langbaseActions } from "./actions.ts";

const service = "langbase";

/**
 * Langbase provider backed by the public Langbase API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Langbase",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "User/Org API Key",
      placeholder: "LANGBASE_API_KEY",
      description:
        "Langbase User or Org API key used with the Authorization Bearer header. Create it in Langbase Studio > API keys: https://studio.langbase.com/ and see the official guide: https://langbase.com/docs/api-reference/api-keys",
    },
  ],
  homepageUrl: "https://langbase.com",
  actions: langbaseActions,
};
