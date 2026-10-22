import type { ProviderDefinition } from "../../core/types.ts";

import { unsplashActions } from "./actions.ts";

const service = "unsplash";

export const provider: ProviderDefinition = {
  service,
  displayName: "Unsplash",
  categories: ["Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Key",
      placeholder: "UNSPLASH_ACCESS_KEY",
      description:
        "Unsplash access key used with the Authorization Client-ID header. Register an application to get it as documented at https://unsplash.com/documentation.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://unsplash.com",
  actions: unsplashActions,
};
